



export interface HasSeed {
    seed: number ; 
}

export interface HasSeedVariations {
    numSeedVariations: number ; 
}

export interface HasBasicPrompts {
    pmtStyle: string;
    pmtScene: string;
    pmtNegative: string;
}

export interface HasSemanticInfo {
    mapSemanticStr: string;
}

export interface HasSemanticImgInfo {
    imgSemantic: string;
}

export interface HasDepthInfo {
    imgDepth: string;
}

export interface HasRootImgInfo {
    imgRoot: string;
}

export interface HasSemanticConfig {
    numInferenceStepsBase: number,
    numInferenceStepsInpaint: number,
    numInferenceStepsOutpaint: number,
    strengthInpaint: number,
    strengthOutpaint: number,
    controlnetConditioningScaleBase: number,
    controlnetConditioningScaleInpaint: number,
    controlnetConditioningScaleOutpaint: number,
    controlGuidanceStartBase: number,
    controlGuidanceEndBase: number,
    controlGuidanceStartInpaint: number,
    controlGuidanceEndInpaint: number,
    controlGuidanceStartOutpaint: number,
    controlGuidanceEndOutpaint: number,
    guidanceScaleBase: number,
    guidanceScaleInpaint: number,
    guidanceScaleOutpaint: number,
}

export interface HasRefinementConfig {
    numInferenceStepsBase: number;
    numInferenceStepsRefiner: number;
    strength: number;
    controlnetConditioningScale: number;
    controlGuidenceStart: number;
    controlGuidenceEnd: number;
}