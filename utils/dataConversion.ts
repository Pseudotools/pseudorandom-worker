import { SQSEvent } from 'aws-lambda';
import { PredictionJob, PredictionJobInitialization, PredictionIncoming, SemanticPredictionIncoming, RefinementPredictionIncoming } from '../types/Prediction';

//
// Validate SQS event and extract initialization data
//
export const SQSEventToJobInitialization = (event: SQSEvent): PredictionJobInitialization => {
    if (!event.Records || event.Records.length === 0) { throw new Error('No records found in the event'); }

    const sqsBody = event.Records[0].body;
    if (!sqsBody || sqsBody.trim() === '') { throw new Error('No body found in the SQS message'); }

    try {
        return JSON.parse(sqsBody);
    } catch (error) { 
        throw new Error('Invalid JSON format in SQS message body'); 
    }
}

//
// given an PredictionJobInitialization object, return an initalized PredictionJob object
//
export const initializationDataToPredictionJob = (initData: PredictionJobInitialization): PredictionJob => {
    const currentDate = new Date().toISOString();
    return {
        jobId: initData.jobId,
        type: initData.predictionOutgoing.type, 
        createdAt: currentDate,
        updatedAt: currentDate,
        userId: initData.userId,
        transactionId: null,
        originEnvironment: initData.originEnvironment,
        originId: initData.originId,
        status: 'pending',
        predictionOutgoing: initData.predictionOutgoing,
        predictionIncoming: null, 
        renderIds: null,
        computeTime: null, // time to compute on Replicate
        deliveryTime: null, // time between initial request and final delivery
        errorMessage: null,
        serverLog: null,
    };
}


// given a server response from Replicate,
// return an object that adheres to the SemanticPredictionIncoming interface
// with no extra keys or whatnot
export const replicateResponseToSemanticPredictionIncoming = (response: any): SemanticPredictionIncoming => {
    const predictionData = extractPredictionIncoming(response);
    return {
        ...predictionData,
        type: 'semantic'
    };
};


// given a server response from Replicate,
// return an object that adheres to the RefinementPredictionIncoming interface
// with no extra keys or whatnot
export const replicateResponseToRefinementPredictionIncoming = (response: any): RefinementPredictionIncoming => {
    const predictionData = extractPredictionIncoming(response);
    return {
        ...predictionData,
        type: 'refinement'
    };
};

// given a server response from Replicate,
// return an object that adheres to the PredictionDataIncoming interface
// with no extra keys or whatnot
// this is called by extractCollagerDataIncoming  and extractRefinerDataIncoming 
const extractPredictionIncoming = (response: any): PredictionIncoming => {
    if (typeof response !== 'object' || response === null) { throw new Error("extractPredictionIncoming: Invalid response object"); } // Ensure response is an object

    // Helper function to extract and validate the "output" property
    const extractOutput = (output: any): PredictionIncoming['output'] => {
        if (typeof output !== 'object' || output === null) throw new Error("extractPredictionIncoming: Invalid output");
        if (!Array.isArray(output.urls_result) || !output.urls_result.every((url: any) => typeof url === 'string')) throw new Error("extractPredictionIncoming: Invalid urls_result in output");

        // could be "seeds" in an array, or "seed" as a singleton
        let finalSeeds;
        if (Array.isArray(output.seeds)) {
            finalSeeds = output.seeds;
        } else if (output.seed) {
            finalSeeds = [output.seed];
        } else {
            throw new Error("extractPredictionIncoming: No valid seeds or seed found in output");
        }

        return {
            seeds: finalSeeds,
            urls_result: output.urls_result
        };
    };

    const extractMetrics = (metrics: any): PredictionIncoming['metrics'] => {
        if (typeof metrics !== 'object' || metrics === null) throw new Error("extractPredictionIncoming: Invalid metrics");
        if (typeof metrics.predict_time !== 'number') throw new Error("extractPredictionIncoming: Invalid predict_time in metrics");

        return {
            predict_time: metrics.predict_time
        };
    };

    // Construct and return the PredictionIncoming object
    // Validate 'id' field
    if (typeof response.id !== 'string') {
        throw new Error("extractPredictionIncoming: Invalid id");
    }

    // Validate 'error' field
    if (response.error && typeof response.error !== 'string') {
        throw new Error("extractPredictionIncoming: Invalid error");
    }

    // Extract and validate output and metrics
    const output = extractOutput(response.output);
    const metrics = extractMetrics(response.metrics);

    return {
        type: 'error', // this will be overwritten by the calling function
        id: response.id,
        output: output,
        metrics: metrics,
    };
};