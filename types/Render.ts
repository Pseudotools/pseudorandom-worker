

//
// Render
// Defines the structure of individual renders produced from a Prediction job.

export interface Render {
    renderId: string;  // Unique identifier for the individual render
    sessionId: string; // the renderSessionId
    jobId: string;  // ID of the associated prediction job
    url: string | null;  // public URL of the generated image
    userId: string;  // ID of the user associated with the render
    createdAt: string;  // Timestamp indicating when the render was created
    updatedAt: string;  // Timestamp indicating when the render was created
    type: 'error' | 'semantic' | 'refinement' ;  // Type of render, corresponds to the associated render job type
    status: 'error' | 'pending' | 'starting' | 'processing' | 'succeeded' | 'canceled' | 'failed';
    width: number | null;  // Width of the image
    height: number | null; // Height of the image
    seed: number | null;  // Seed used to generate the image
}