import { SemanticPredictionOutgoingMultiseed, SemanticPredictionOutgoingSingleseed, RefinementPredictionOutgoing } from '@/types/Prediction';

export interface GenericAPIDataResponseStructure<T> {
    success: boolean;
    data?: T;
    error?: string;
}


//
// Replicate Prediction Initialization
//

export type PredictionInitializationData = {
    version: string | undefined;
    input: SemanticPredictionOutgoingMultiseed | SemanticPredictionOutgoingSingleseed | RefinementPredictionOutgoing;
};

export async function ReplicatePredictionInitalizer(data: PredictionInitializationData): 
Promise<GenericAPIDataResponseStructure<any>> {
    try {
        const headers = {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
        }

        const body = JSON.stringify(data);

        const replicateApiResponse = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: headers,
            body: body,
        });

        if (replicateApiResponse.status !== 201) {
            const errorData = await replicateApiResponse.json();
            console.error("genericReplicatePredictionInitalizer error:");
            console.error(errorData);
            console.log(headers);
            console.log(body);
            return { success: false, error: errorData.detail };
        }

        const responseData = await replicateApiResponse.json();
        return { success: true, data: responseData };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}


//
// Replicate Prediction Retrieval
//

export async function ReplicatePredictionRetriver(id: string): 
Promise<GenericAPIDataResponseStructure<any>> {
    try {
        const response = await fetch(
            "https://api.replicate.com/v1/predictions/" + id,
            {
                headers: {
                    Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.status !== 200) {
            let error = await response.json();
            return { success: false, error: error.detail };
        }

        const responseData = await response.json();
        return { success: true, data: responseData };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}




