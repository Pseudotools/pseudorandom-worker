import { SQSEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { PredictionJobInitialization, PredictionJob, SemanticPredictionIncoming, RefinementPredictionIncoming } from './types/Prediction';

import { PredictionInitializationData, ReplicatePredictionInitalizer, ReplicatePredictionRetriver } from './utils/replicateApiServices';
import { initializationDataToPredictionJob, SQSEventToJobInitialization, replicateResponseToSemanticPredictionIncoming, replicateResponseToRefinementPredictionIncoming } from './utils/dataConversion';
import { createChargeAndAdjustUserBalance } from './utils/transactionServices';
import { createPredictionJobInDatabase, updatePredictionJobStatus, updatePredictionJobAsError, updatePredictionJobAsSuccess, createErrorPredictionJobInDatabase, updatePredictionJobWithServerLog, updatePredictionJobWithRenderIds } from './utils/predictionJobServices';
import { getUserProfileById } from './utils/userServices';
import { createPendingRendersFromUnresolvedPredictionJob, updateRendersFromResolvedPredictionJob, updateRenderStatus } from './utils/renderServices';


const MAX_WAIT_TIME = 8 * 60 * 1000; // 8 minutes in milliseconds


export const handler = async (event: SQSEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const workerStartTime = new Date();

    // extract initialization data from SQS event
    let predictionJobInitialization: PredictionJobInitialization;
    try {
        predictionJobInitialization = SQSEventToJobInitialization(event);
    } catch (error) {
        console.error(error.message);
        return { statusCode: 400, body: JSON.stringify(`Bad Request: ${error.message}`) };
    }


    // databaseURL has been passed in predictionJobInitialization
    // extract databaseURL and set it to process.env.NEXT_PUBLIC_SUPABASE_URL
    const { environment } = predictionJobInitialization;
    if (!environment || typeof environment !== 'string') {
        console.error('Invalid or missing environment');
        return { statusCode: 400, body: JSON.stringify('Bad Request: Invalid or missing environment') };
    }
    
    // Use environment variables to get Supabase URL and anon key
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD;
    let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;
    if (environment === 'development') {
        supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV;
        supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV;
    } 

    const supabaseServiceRoleClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey); // Initialize and export the Supabase client




    //
    // Create a prediction job in the database
    // any errors after this must be caught and the job updated to error status
    //
    let jobId;
    let predictionJob: PredictionJob;
    let renders;

    try {
        predictionJob = initializationDataToPredictionJob(predictionJobInitialization);
        await createPredictionJobInDatabase(predictionJob, supabaseServiceRoleClient);
        jobId = predictionJob.jobId;
        console.log('PredictionJob created successfully')

    } catch (error) {
        // If we can't create a prediction job in the database
        // we create an "error" prediction in the database
        // so that clients can see that something went wrong
        console.error('An error occurred when initializing PredictionJob.', error);
        const errorMessage = error.message;
        try {
            const updatedJob = await createErrorPredictionJobInDatabase(predictionJobInitialization, errorMessage, supabaseServiceRoleClient);
            console.log('Created error-like job', updatedJob);
        } catch (updateError) {
            console.error('Error creating error-like job', updateError);
        }
        return { statusCode: 500, body: JSON.stringify('An error occurred when initializing PredictionJob.: ' + errorMessage) };
    }

    try {
        // Authenticate the user
        // check for permission to create a prediction job
        // upon failure, create an "error" prediction in the database
        const user = await getUserProfileById(predictionJob.userId, supabaseServiceRoleClient);
        if (!user) { throw new Error('No user found with ID ' + predictionJob.userId); }
        if (user.role == 'suspended') { throw new Error('User is suspended'); }
        if (user.balance == 0) { throw new Error('User has insufficient balance'); }

        

        //
        // Create unresolved Renders in the database
        // any errors after this must be caught and the job updated to error status
        //
        renders = await createPendingRendersFromUnresolvedPredictionJob(predictionJob, supabaseServiceRoleClient) // Extracting renderId from each render object and assigning to predictionJob.renderIds
        updatePredictionJobWithRenderIds(predictionJob, renders, supabaseServiceRoleClient); // update predictionJob in database with renderIds

        //
        // Do the initial API call to Replicate
        //

        // Create PredictionInitializationData with some dummy values.
        const predictionInitData: PredictionInitializationData = {
            version: predictionJob.predictionModelVersionId,
            input: predictionJob.predictionOutgoing // Assuming predictionOutgoing is defined somewhere
        };

        // Call ReplicatePredictionInitializer and handle the response.
        const initResponse = await ReplicatePredictionInitalizer(predictionInitData);
        if (!initResponse.success) { throw new Error(initResponse.error); }
        let replicteResponse = initResponse.data;

        //
        // Do the waiting around API call to Replicate
        //

        let currentStatus = 'pending';
        const startTime = Date.now();
        while (true) {
            // Check if max waiting time has been exceeded
            if (Date.now() - startTime > MAX_WAIT_TIME) {
                throw new Error('Server timeout: maximum wait time exceeded.');
            }

            const retrievalResponse = await ReplicatePredictionRetriver(replicteResponse.id);
            if (!retrievalResponse.success) { throw new Error(retrievalResponse.error); }
            replicteResponse = retrievalResponse.data;
            console.log(currentStatus);

            // status update
            if (replicteResponse.status !== currentStatus) {
                currentStatus = replicteResponse.status;
                await updatePredictionJobStatus(jobId, currentStatus, supabaseServiceRoleClient);

                for (const render of renders) {
                    await updateRenderStatus(render.renderId, currentStatus, supabaseServiceRoleClient);
                }

            }

            // break if we've reached a terminal state
            if (['succeeded', 'canceled', 'failed'].includes(replicteResponse.status)) { break; }

            // Pause for a while before the next iteration, to avoid hammering the API.
            await new Promise(res => setTimeout(res, 3000));
        }

        switch (replicteResponse.status) {
            case 'succeeded':
                //
                // SUCCESS!
                //
                // Handle the successful case
                console.log('Prediction succeeded.');
                predictionJob.status = 'succeeded';


                // Extract PredictionIncoming data from the response
                // and set predictionJob.predictionIncoming accordingly
                let type = null;
                if (predictionJob.type == 'semantic') {
                    type = 'semantic';
                    const predictionIncoming: SemanticPredictionIncoming = replicateResponseToSemanticPredictionIncoming(replicteResponse);
                    predictionJob.predictionIncoming = predictionIncoming;
                    predictionJob.computeTime = predictionIncoming.metrics.predict_time;
                }
                if (predictionJob.type == 'refinement') {
                    type = 'refinement';
                    const predictionIncoming: RefinementPredictionIncoming = replicateResponseToRefinementPredictionIncoming(replicteResponse);
                    predictionJob.predictionIncoming = predictionIncoming;
                    predictionJob.computeTime = predictionIncoming.metrics.predict_time;
                }
                if (!type) { throw new Error('predictionJob is an unexpected type: ' + predictionJob.type) }

                // Determine subtype based on predictionJob type
                let subtype;
                if (predictionJob.type === 'semantic') {
                    subtype = 'semanticPredictionJob';
                } else if (predictionJob.type === 'refinement') {
                    subtype = 'refinementPredictionJob';
                } else { subtype = 'error'; }


                //
                // Transaction
                // charge the user and record the transaction
                const transactionId = await createChargeAndAdjustUserBalance({
                    chargeAmount: predictionJob.computeTime,
                    userId: user.userId,
                    subtype: subtype
                }, supabaseServiceRoleClient);
                predictionJob.transactionId = transactionId;

                // Update the prediction job with other values required by database
                predictionJob.deliveryTime = (new Date().getTime() - workerStartTime.getTime()) / 1000;
                predictionJob.serverLog = replicteResponse.logs;
                await updatePredictionJobAsSuccess(predictionJob, supabaseServiceRoleClient);

                //
                // Update Renders
                //
                await updateRendersFromResolvedPredictionJob(predictionJob, renders, supabaseServiceRoleClient);


                return { statusCode: 200, body: JSON.stringify('Prediction job exited successfully') };

            case 'canceled':
            case 'failed':
                // Handle the error cases. E.g.:
                console.log('Prediction failed or was canceled.');
                console.log(replicteResponse.logs);

                try {
                    await updatePredictionJobWithServerLog(jobId, replicteResponse.logs, supabaseServiceRoleClient); // set predictionJob.serverLog and update database
                } catch (error) {
                    console.error('Failed to update server log in the database', error);
                    throw new Error('Failed to update server log in the database. Also, Prediction failed or was canceled. Server reported error: ' + replicteResponse.message);
                }

                // update render status
                if (renders) {
                    for (const render of renders) {
                        await updateRenderStatus(render.renderId, "error", supabaseServiceRoleClient);
                    }
                    console.log('Renders marked as error');
                }

                throw new Error('Prediction failed or was canceled. Server reported error: ' + replicteResponse.error); // This will be caught below.

            default:
                console.log('Unexpected status:', replicteResponse.status);
                throw new Error('Unexpected status: ' + replicteResponse.status); // This will be caught below.
        }

    } catch (error) {
        console.error('error:', error);
        const errorMessage = error.message;
        try {
            const updatedJob = await updatePredictionJobAsError(jobId, errorMessage, supabaseServiceRoleClient);
            console.log('Job marked as error', updatedJob);

            // update render status
            if (renders) {
                for (const render of renders) {
                    await updateRenderStatus(render.renderId, "error", supabaseServiceRoleClient);
                }
                console.log('Renders marked as error');
            }
        } catch (updateError) {
            console.error('Error updating job as error:', updateError);
        }
        return { statusCode: 500, body: JSON.stringify('An error occurred after initializing PredictionJob: ' + errorMessage) };
    }


};





