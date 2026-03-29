export enum AIActionType {
  TEXT_GENERATION = 'TEXT_GENERATION',
  IMAGE_ANALYSIS = 'IMAGE_ANALYSIS',
  IMAGE_ENHANCEMENT = 'IMAGE_ENHANCEMENT',
  VIDEO_GENERATION = 'VIDEO_GENERATION',
  AD_COPY = 'AD_COPY',
  PRODUCT_OPTIMIZER = 'PRODUCT_OPTIMIZER'
}

export interface AIRequest {
  action: AIActionType;
  payload: any;
}

export interface AIResponse {
  success: boolean;
  result?: any;
  tokensUsed?: number;
  error?: string;
  requiredPlan?: string;
}
