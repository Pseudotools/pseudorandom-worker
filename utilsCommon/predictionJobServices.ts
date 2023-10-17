import { PredictionJob, PredictionJobInitialization } from '@/types/Prediction';
import { supabaseServiceRoleClient } from './supabaseServiceClient';
import { getUserProfileById } from './userServices';


//
// getPredictionJobById
// given a jobId, return the corresponding PredictionJob object
//
export const getPredictionJobById = async (jobId: string): Promise<PredictionJob | null> => {
    const { data, error } = await supabaseServiceRoleClient
        .from('predictionJobs')
        .select('*') 
        .eq('jobId', jobId)
        .single(); 

    if (error) {
        throw error;
    }

    return data ?? null;  
}


//
// given a PredictionJob object, create a new PredictionJob in the database
// details of the PredictionJob object are defined in dataConversion/SQSEventToJobInitialization
//
export const createPredictionJobInDatabase = async (predictionJob: PredictionJob): Promise<any> => {
    const { data, error } = await supabaseServiceRoleClient
        .from('predictionJobs')
        .insert([predictionJob]);

    if (error) {
        throw error;
    }

    return data;  // pretty sure this is null
}


// given a PredictionJob object, update the corresponding PredictionJob in the database
//
export const updatePredictionJobAsSuccess = async (predictionJob: PredictionJob): Promise<any> => {
    // Set the updatedAt field to the current time
    predictionJob.updatedAt = new Date().toISOString();
    predictionJob.status = 'succeeded';
    predictionJob.updatedAt = new Date().toISOString();

    const { data, error, count } = await supabaseServiceRoleClient
        .from('predictionJobs')
        .update(predictionJob)
        .eq('jobId', predictionJob.jobId);

    if (error) {
        const message = `Failed to update job ${predictionJob.jobId}`;
        console.error(message, error);
        throw new Error(message);
    }

    if (count === 0) {
        const message = `No job found with ID ${predictionJob.jobId} to update.`;
        console.error(message);
        throw new Error(message);
    }

    console.log(`Job ${predictionJob.jobId} updated successfully.`);
    return data;  // Though it's null, returning for consistency if needed in future.
};


//
// given a jobId and a status 
// update the PredictionJob in the database
//
export const updatePredictionJobStatus = async (jobId: string, status: string): Promise<any> => {
    const updatedJob = {
        status: status,
        updatedAt: new Date().toISOString(),
    };

    const { data, error, count } = await supabaseServiceRoleClient
        .from('predictionJobs')
        .update(updatedJob)
        .eq('jobId', jobId);

    if (error) {
        const message = `Failed to update job ${jobId}`;
        console.error(message, error);
        throw error;
    }

    if (count === 0) {
        const message = `No job found with ID ${jobId} to update.`;
        console.error(message);
        throw new Error(message);
    }
    console.log(`Job ${jobId} updated successfully with status: ${status}`);
    return data; // Though it's null, returning for consistency if needed in future.
};



//
// given a jobId and an error message, 
// update the PredictionJob in the database and set as type 'error'
//
export const updatePredictionJobAsError = async (jobId: string, errorMessage: string): Promise<any> => {
    const updatedJob = {
        status: 'error',
        errorMessage: errorMessage,
        updatedAt: new Date().toISOString(),
    };

    const { data, error, count } = await supabaseServiceRoleClient
        .from('predictionJobs')
        .update(updatedJob)
        .eq('jobId', jobId);

    if (error) {
        const message = `Failed to update job ${jobId}`;
        console.error(message, error);
        throw error;
    }

    if (count === 0) {
        const message = `No job found with ID ${jobId} to update.`;
        console.error(message);
        throw new Error(message);
    }

    //console.log(`Job ${jobId} updated successfully with error: ${errorMessage}`);
    return data; // Though it's null, returning for consistency if needed in future.
};


// given a PredictionJobInitialization that is somehow bad,
// create an "error" predictionJob in the database
export const createErrorPredictionJobInDatabase = async (
    predictionJobInitialization: PredictionJobInitialization,
    errorMessage: string, 
): Promise<any> => {

    let userId : string | null = predictionJobInitialization.userId;
    try {
        await getUserProfileById(userId);
    } catch (error) {
        console.log(`User ${userId} not found, setting userId to null.`);
        userId = null;
    }


    const errorPredictionJob: PredictionJob = {
        ...predictionJobInitialization, 
        userId: userId, // possibly null if userId is not found in database
        transactionId: null,
        type: 'error',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'error',
        predictionIncoming: null,
        renderIds: null,
        computeTime: null,
        deliveryTime: null,
        errorMessage: errorMessage,
        serverLog: null
    };

    const { data, error } = await supabaseServiceRoleClient
        .from('predictionJobs')
        .insert([errorPredictionJob]);

    if (error) {
        console.error('Failed to insert error job into the database', error);
        throw error;
    }

    console.log('Error PredictionJob inserted successfully', data);
    return data;  
}


//
// given a jobId and a server log, 
// update the serverLog property of the PredictionJob in the database
//
export const updatePredictionJobWithServerLog = async (jobId: string, serverLog: string): Promise<any> => {
    const updatedJob = {
        serverLog: serverLog,
        updatedAt: new Date().toISOString(),
    };

    const { data, error, count } = await supabaseServiceRoleClient
        .from('predictionJobs')
        .update(updatedJob)
        .eq('jobId', jobId);

    if (error) {
        const message = `Failed to update job ${jobId} with server log`;
        console.error(message, error);
        throw error;
    }

    if (count === 0) {
        const message = `No job found with ID ${jobId} to update.`;
        console.error(message);
        throw new Error(message);
    }

    console.log(`Job ${jobId} updated successfully with server log.`);
    return data; // Though it's null, returning for consistency if needed in future.
};
