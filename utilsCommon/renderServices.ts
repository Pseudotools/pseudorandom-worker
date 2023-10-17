
import { supabaseServiceRoleClient } from './supabaseServiceClient';

import { PredictionJob } from '@/types/Prediction';
import { postReplicateURLToStorage } from './storageServices';
import { Render } from '@/types/Render';



export const createRendersInDatabase = async (renders: Render[]): Promise<any> => {
    const { data, error } = await supabaseServiceRoleClient
        .from('renders')
        .insert(renders);  // Inserting an array of render objects

    if (error) {
        console.error('Failed to insert renders into the database', error);
        throw error;
    }

    console.log('Renders inserted successfully', data);
    return data;  
}


export const updateRendersInDatabase = async (renders: Render[]): Promise<any> => {
    // Making sure renders array is not empty
    if (renders.length === 0) {
        console.error('Renders array is empty. No update is performed.');
        return;
    }

    try {
        // Looping through the renders array and updating each render in the database
        const promises = renders.map(async (render) => {
            const { data, error } = await supabaseServiceRoleClient
                .from('renders')
                .update({
                    sessionId: render.sessionId,
                    jobId: render.jobId,
                    url: render.url,
                    userId: render.userId,
                    updatedAt: new Date().toISOString(), 
                    type: render.type,
                    status: render.status,
                    width: render.width,
                    height: render.height             
                })
                .eq('renderId', render.renderId);  // Matching renderId to identify the record to update

            if (error) {
                console.error('Failed to update render in the database', error);
                throw error;
            }

            //console.log('Render updated successfully', data);
            return data;
        });

        // Waiting for all updates to complete
        return await Promise.all(promises);
    } catch (error) {
        console.error('Error updating renders in the database', error);
        throw error;
    }
};



export async function createPendingRendersFromUnresolvedPredictionJob(predictionJob: PredictionJob): Promise<Render[]> {
    const renders: Render[] = [];
    try {
        if (predictionJob.userId === null) { throw new Error('createPendingRendersFromUnresolvedPredictionJob: PredictionJob userId is null'); }

        for (let i = 0; i < predictionJob.expectedImageCount; i++) {
            const numberSuffix = String(i).padStart(2, '0');  // Create a two-digit suffix
            const renderId = `${predictionJob.jobId}-${numberSuffix}`;  // Append the suffix to the jobId

            const render: Render = {
                renderId: renderId,
                sessionId: predictionJob.sessionId,
                jobId: predictionJob.jobId,
                url: null,
                userId: predictionJob.userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(), 
                type: predictionJob.type,
                status: 'pending',
                width: null,
                height: null
            };
            renders.push(render);  // Collect renders
        }

        await createRendersInDatabase(renders);  // Removed inner try-catch
        console.log('Renders saved successfully');
        return renders;

    } catch (error) {
        console.error('Error:', error);  // Simplified error message
        throw error;  // Rethrowing the error to be handled by the caller
    }
}


//
// given a jobId and a status 
// update the PredictionJob in the database
//
export const updateRenderStatus = async (renderId: string, status: string): Promise<any> => {
    const updatedRender = {
        status: status,
        updatedAt: new Date().toISOString(),
    };

    const { data, error, count } = await supabaseServiceRoleClient
        .from('renders')
        .update(updatedRender)
        .eq('renderId', renderId);

    if (error) {
        const message = `Failed to update render ${renderId}`;
        console.error(message, error);
        throw error;
    }

    if (count === 0) {
        const message = `No render found with ID ${renderId} to update.`;
        console.error(message);
        throw new Error(message);
    }
    console.log(`Render ${renderId} updated successfully with status: ${status}`);
    return data; // Though it's null, returning for consistency if needed in future.
};




export async function updateRendersFromResolvedPredictionJob(predictionJob: PredictionJob, renders: Render[]): Promise<Render[]> {
    if (predictionJob.predictionIncoming === null) { throw new Error('updateRendersFromResolvedPredictionJob: PredictionJob predictionIncoming is null'); }

    const urlsResult = predictionJob.predictionIncoming.output.urlsResult;

    if (urlsResult.length !== renders.length) {
        throw new Error('The number of renders does not match the number of URL results.');
    }

    try {
        for (let i = 0; i < urlsResult.length; i++) {
            const replicateURL = urlsResult[i];
            const render = renders[i];

            const supabaseURL = await postReplicateURLToStorage(replicateURL, predictionJob.type, render.renderId);

            render.url = supabaseURL;
            render.status = predictionJob.status;
            render.width = predictionJob.predictionIncoming.output.imgSize[0];
            render.height = predictionJob.predictionIncoming.output.imgSize[1];
            render.updatedAt = new Date().toISOString();
        }

        try {
            await updateRendersInDatabase(renders);
            console.log('Renders updated successfully');
        } catch (error) {
            console.error('Failed to update renders in database:', error);
            throw error;  // You may want to rethrow the error to handle it upstream
        }
    } catch (error) {
        console.error('Error updating renders:', error);
        throw error;
    }

    return renders // Return the renderIds of the updated renders
}








