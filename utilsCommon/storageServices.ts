import { supabaseServiceRoleClient } from './supabaseServiceClient';

import { Render } from '@/types/Render';

// Supabase Storage constants
const semanticSourceBucketName = "semanticSource"
const depthSourceBucketName = "depthSource"
const semanticRenderBucketName = "semanticRenders"
const refinementRenderBucketName = "refinementRenders"


export async function postSourceBase64URLToStorage(base64Image: string, imgType: string, guid: string): Promise<string> {
    try {
        if (typeof base64Image !== 'string') { throw new Error('Provided image is not a valid base64 string'); }

        let bucketName;
        switch (imgType) {
            case 'depth':
                bucketName = depthSourceBucketName; // Replace with actual bucket name
                break;
            case 'semantic':
                bucketName = semanticSourceBucketName; // Replace with actual bucket name
                break;
            default:
                throw new Error('Unsupported image type: ' + imgType);
        }

        const fileName = `${guid}.png`;

        // Check if the base64 string has the prefix of data URL
        // Validate if it's a valid base64 string
        const base64Prefix = 'data:image/png;base64,';
        if (base64Image.startsWith(base64Prefix)) { base64Image = base64Image.substring(base64Prefix.length); }
        if (Buffer.from(base64Image, 'base64').toString('base64') !== base64Image) { throw new Error('Invalid base64 string');  }
        

        const imageBuffer = Buffer.from(base64Image, 'base64');
        const { error: uploadError } = await supabaseServiceRoleClient.storage
            .from(bucketName)
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
            });

        if (uploadError) {
            throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
        }

        const { data } = supabaseServiceRoleClient.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        if (!data?.publicUrl) {
            throw new Error('Failed to retrieve public URL from storage');
        }

        return data.publicUrl;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown storage error occurred');
        }
    }
}




export async function postReplicateURLToStorage(imageUrl: string, imgType: string, guid: string): Promise<string> {
    try {
        let bucketName;

        switch (imgType) {          
            case 'semantic':
                bucketName = semanticRenderBucketName;
                break;
            case 'refinement':
                bucketName = refinementRenderBucketName;
                break;
            default:
                throw new Error('Cannot post this Render type to storage: ' + imgType);
        }

        const fileName = `${guid}.png`;

        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch the image: ${response.statusText}`);
        }

        if (!response.headers.get('content-type')?.startsWith('image')) {
            throw new Error('The content type is not an image');
        }

        const imageBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabaseServiceRoleClient.storage
            .from(bucketName)
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
            });

        if (uploadError) {
            throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
        }

        const { data } = supabaseServiceRoleClient.storage
            .from(bucketName)
            .getPublicUrl(fileName);


        if (!data?.publicUrl) {
            throw new Error('Failed to retrieve public URL from storage');
        }

        return data.publicUrl;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown storage error occurred');
        }
    }
}
