interface PredictionBase {
    type: 'error' | 'semantic' | 'refinement' ; 
}


//
// PredictionJob
//
// pending - worker has accepted the job, and set the inital entry in database
// starting, processing, succeeded, canceled, failed - set per Replicate API
export interface PredictionJob extends PredictionBase {   
    jobId: string; // before sending to worker
    createdAt: string;
    updatedAt: string;
    userId: string; // we check this userId against our database
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
}
// PredictionJobInitialization
// describes the data we need to create a new PredictionJob
export interface PredictionJobInitialization {
    jobId: string;
    userId: string;
    originEnvironment: 'webapp' | 'rhino';    
    originId: string;
    predictionOutgoing: SemanticPredictionOutgoingMultiseed | SemanticPredictionOutgoingSingleseed | RefinementPredictionOutgoing;
}



//
// PredictionIncoming
// Parent class of SemanticPredictionIncoming, RefinementPredictionIncoming
// defines the structure we create any time we recieve a response from the API on Replciate

export interface PredictionIncoming extends PredictionBase {
    id: string;
    output: {
        seeds: number[];
        urls_result: string[];
    };
    metrics: {
        predict_time: number; // time of prediction measured by Replicate
    };
}

//
// PredictionOutgoing
// Parent class of SemanticPredictionOutgoing, RefinementPredictionOutgoing
// defines the structure we need to provide to APIs on Replciate
export interface PredictionOutgoing extends PredictionBase  {
    pmt_style: string;
    pmt_outpaint: string;
    pmt_negative: string;
    map_semantic_str: string;

    img_depth: string;
}


//
// Semantic Types
//


//
// SemanticPredictionIncoming
// defines the structure we create any time we recieve a response from the Semantic API on Replciate
// the structure shown here follows but does not exactly reproduce what the Semantic Model on Replicate produces
export interface SemanticPredictionIncoming extends PredictionIncoming {
    type: 'semantic';
    // everything is done in PredictionDataIncoming
}

//
// SemanticPredictionOutgoing
// defines the structure we need to provide to the Semantic API on Replciate
// look to children interfaces for different styles of seed generation
export interface SemanticPredictionOutgoing extends PredictionOutgoing  {
    type: 'semantic';
    subtype: 'error' | 'single-seed' | 'multi-seed'; 
    // all prompts handled in PredictionOutgoing
    // img_depth handled in PredictionOutgoing
    img_semantic: string;

    num_inference_steps_base: number,
    num_inference_steps_inpaint: number,
    num_inference_steps_outpaint: number,
    noisiness_img_base: number,
    noise_periodicity_img_base: number,
    strength_inpaint: number,
    strength_outpaint: number,
    controlnet_conditioning_scale_base: number,
    controlnet_conditioning_scale_inpaint: number,
    controlnet_conditioning_scale_outpaint: number,
    control_guidance_start_base: number,
    control_guidance_end_base: number,
    control_guidance_start_inpaint: number,
    control_guidance_end_inpaint: number,
    control_guidance_start_outpaint: number,
    control_guidance_end_outpaint: number,
    guidance_scale_base: number,
    guidance_scale_inpaint: number,
    guidance_scale_outpaint: number,
}

// only appropriate for generating multiple images with random seeds
export interface SemanticPredictionOutgoingMultiseed extends SemanticPredictionOutgoing {
    subtype: 'multi-seed';
    num_seed_variations: number;
}

// only appropriate for generating a single image with a set seed
export interface SemanticPredictionOutgoingSingleseed extends SemanticPredictionOutgoing {
    subtype: 'single-seed';
    seed: number;
}


//
// Refinement Types
//


//
// RefinementPredictionIncoming
//
// defines the structure we create any time we recieve a response from the Refiner API on Replciate
export interface RefinementPredictionIncoming extends PredictionIncoming {
    type: 'refinement';
    // everything is done in PredictionIncoming
}


//
// RefinementPredictionOutgoing
//
// defines the structure we need to provide to the Refiner API on Replciate
// only appropriate for generating a single image with a single given seed (or a random seed if seed is not set)
export interface RefinementPredictionOutgoing extends PredictionOutgoing {
    type: 'refinement';
    // all prompts handled in PredictionOutgoing
    // img_depth handled in PredictionOutgoing
    seed: number;
    img_base: string;

    num_inference_steps_base: number;
    num_inference_steps_refiner: number;
    strength: number;
    controlnet_conditioning_scale: number;
    control_guidence_start: number;
    control_guidence_end: number;
}


