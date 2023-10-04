
import { supabaseServiceRoleClient } from './supabaseClient';

import { PredictionJob } from '../types/Prediction';
import { postRemoteURLToStorage } from './storageServices';
import { Render } from '../types/Render';



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



export async function createRendersFromResolvedPredictionJob(predictionJob: PredictionJob): Promise<string[]> {
    const renderIds: string[] = [];
    const renders: Render[] = [];
    const urlsResult = predictionJob.predictionIncoming.output.urls_result;

    try {
        for (let i = 0; i < urlsResult.length; i++) {
            const replicateURL = urlsResult[i];
            const numberSuffix = String(i).padStart(2, '0');  // Create a two-digit suffix
            const renderId = `${predictionJob.jobId}-${numberSuffix}`;  // Append the suffix to the jobId

            const supabaseURL = await postRemoteURLToStorage(replicateURL, predictionJob.type, renderId);

            // TODO
            // REPLACE THIS WITH REPLICATED REPORTED VALUES
            // Get image dimensions
            /*
            async function getImageDimensions(url: string): Promise<{ width: number, height: number }> {
                const response = await fetch(url);
                const buffer = await response.buffer();
                const metadata = await sharp(buffer).metadata();
                return { width: metadata.width!, height: metadata.height! };
            }

            let width, height;
            try {
                const imageDimensions = await getImageDimensions(replicateURL);
                width = imageDimensions.width;
                height = imageDimensions.height;
            } catch (error) {
                console.error('Error getting image dimensions:', error);
                throw error;
            }          
            */  
            /// END TODO



            const render: Render = {
                renderId: renderId,
                jobId: predictionJob.jobId,
                url: supabaseURL,
                userId: predictionJob.userId,
                createdAt: new Date().toISOString(),
                type: predictionJob.type,
                width: 99,  // Update these with actual values as needed
                height: 99
            };

            renderIds.push(renderId);  // Collect renderIds
            renders.push(render);  // Collect renders
        }

        try {
            await createRendersInDatabase(renders);
            console.log('Renders saved successfully');
        } catch (error) {
            console.error('Failed to save renders in database:', error);
        }

    } catch (error) {
        console.error('Error creating renders:', error);
        throw error;  // Rethrowing the error to be handled by the caller
    }

    return renderIds;  // Return the collected renderIds
}







