import { HasSeed, HasSeedVariations, HasBasicPrompts, HasSemanticInfo, HasSemanticImgInfo, HasDepthInfo, HasRootImgInfo, HasSemanticConfig, HasRefinementConfig } from './HasElements';


interface PredictionBase  {
    type: 'error' | 'semantic' | 'refinement' ; 
}


//
// Prediction Jobs
//



//
// PredictionJob
//
// pending - worker has accepted the job, and set the inital entry in database
// starting, processing, succeeded, canceled, failed - set per Replicate API
export interface PredictionJob extends PredictionBase {   
    jobId: string; // before sending to worker
    createdAt: string;
    updatedAt: string;
    userId: string | null; // we check this userId against our database
    sessionId: string; // the renderSessionId
    transactionId: string | null; // refers to a transaction in our database, set if successful
    originEnvironment: 'webapp' | 'rhino';
    originId: string;
    status: 'error' | 'pending' | 'starting' | 'processing' | 'succeeded' | 'canceled' | 'failed';
    predictionOutgoing: SemanticPredictionOutgoingMultiseed | SemanticPredictionOutgoingSingleseed | RefinementPredictionOutgoing;
    predictionIncoming: SemanticPredictionIncoming | RefinementPredictionIncoming | null;
    renderIds: string[] | null;
    computeTime: number | null;
    deliveryTime: number | null;
    errorMessage: string | null;
    serverLog: string | null;
    expectedImageCount: number;
    expectedImageWidth: number | null;
    expectedImageHeight: number | null;
    predictionModelVersionId: string | null;
}

// PredictionJobInitialization
// describes the data we need to create a new PredictionJob
// but without the jobId assigned.
// this is what we recieve at the API endpoint
export interface PredictionJobInitializationUnresolved {
    userId: string;
    sessionId: string;
    originEnvironment: 'webapp' | 'rhino';    
    originId: string;
    expectedImageCount: number;
    expectedImageWidth: number | null;
    expectedImageHeight: number | null;    
    predictionOutgoing: SemanticPredictionOutgoingMultiseed | SemanticPredictionOutgoingSingleseed | RefinementPredictionOutgoing;
}

// PredictionJobInitialization
// describes the data we need to create a new PredictionJob
// this is what we provide to the worker
export interface PredictionJobInitialization extends PredictionJobInitializationUnresolved{
    jobId: string;
    predictionModelVersionId: string;
    environment: 'development' | 'production';
}




//
// Incoming Predictions
//



//
// PredictionIncoming
// Parent class of SemanticPredictionIncoming, RefinementPredictionIncoming
// defines the structure we create any time we recieve a response from the API on Replciate

export interface PredictionIncoming extends PredictionBase {
    id: string;
    output: {
        seeds: number[];
        urlsResult: string[];
        imgSize: number[];
    };
    metrics: {
        predict_time: number; // time of prediction measured by Replicate
    };
}

//
// SemanticPredictionIncoming
// defines the structure we create any time we recieve a response from the Semantic API on Replciate
// the structure shown here follows but does not exactly reproduce what the Semantic Model on Replicate produces
export interface SemanticPredictionIncoming extends PredictionIncoming {
    type: 'semantic';
    // everything is done in PredictionDataIncoming
}


//
// RefinementPredictionIncoming
//
// defines the structure we create any time we recieve a response from the Refiner API on Replciate
export interface RefinementPredictionIncoming extends PredictionIncoming {
    type: 'refinement';
    // everything is done in PredictionIncoming
}






//
// Outgoing Predictions
//

export interface PredictionOutgoingBase extends PredictionBase, HasBasicPrompts, HasDepthInfo, HasSemanticInfo {
    
}


//
// SemanticPredictionOutgoing
// defines the structure we need to provide to the Semantic API on Replciate
// look to children interfaces for different styles of seed generation
export interface SemanticPredictionOutgoing extends PredictionOutgoingBase, HasSemanticImgInfo, HasSemanticConfig  {
    type: 'semantic';
    subtype: 'error' | 'singleseed' | 'multiseed'; 
    // all prompts from PredictionOutgoing
    // imgDepth from PredictionOutgoing
    // imgSemantic from HasSemanticImgInfo
    // configuration from HasSemanticConfig
}

// only appropriate for generating multiple images with random seeds
export interface SemanticPredictionOutgoingMultiseed extends SemanticPredictionOutgoing, HasSeedVariations {
    subtype: 'multiseed';
    // numSeedVariations from HasSeedVariations
}

// only appropriate for generating a single image with a set seed
export interface SemanticPredictionOutgoingSingleseed extends SemanticPredictionOutgoing, HasSeed {
    subtype: 'singleseed';
    // seed from HasSeed
}


//
// RefinementPredictionOutgoing
//
// defines the structure we need to provide to the Refiner API on Replciate
// only appropriate for generating a single image with a single given seed (or a random seed if seed is not set)
export interface RefinementPredictionOutgoing extends PredictionOutgoingBase, HasSeed, HasRootImgInfo, HasRefinementConfig {
    type: 'refinement';
    // all prompts from PredictionOutgoing
    // imgDepth from PredictionOutgoing
    // seed from HasSeed
    // imgRoot from HasRootImgInfo
    // configuration from HasRefinementConfig
}


export const isSemanticSingleSeedPredictionOutgoing = (obj: any): obj is SemanticPredictionOutgoingSingleseed => {
    return obj && obj.type === 'semantic' && obj.subtype === 'singleseed';
};

export const isSemanticMultiSeedPredictionOutgoing = (obj: any): obj is SemanticPredictionOutgoingMultiseed => {
    return obj && obj.type === 'semantic' && obj.subtype === 'multiseed';
};

export const isRefinementPredictionOutgoing = (obj: any): obj is RefinementPredictionOutgoing => {
    return obj && obj.type === 'refinement';
};