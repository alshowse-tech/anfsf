/**
 * ANFSF V1.5.0 - Quantization Integration
 *
 * 4-bit/8-bit quantization using Transformers.js.
 * Provides token compression, attention optimization, and memory reduction.
 */
/**
 * Quantization configuration.
 */
export interface QuantizationConfig {
    bits: 4 | 8;
    method: 'symmetric' | 'asymmetric';
    perChannel: boolean;
    enableCalibration: boolean;
}
/**
 * Quantized token representation.
 */
export interface QuantizedToken {
    original: string;
    quantized: number;
    scale: number;
    zeroPoint: number;
}
/**
 * Quantization result.
 */
export interface QuantizationResult {
    tokens: QuantizedToken[];
    compressionRatio: number;
    memorySaved: number;
    originalSize: number;
    quantizedSize: number;
}
/**
 * Quantization class for token compression and attention optimization.
 */
export declare class Quantizer {
    private config;
    private calibrated;
    private scaleMap;
    private zeroPointMap;
    constructor(config?: Partial<QuantizationConfig>);
    /**
     * Calibrate quantization parameters.
     */
    calibrate(tokens: string[]): Promise<void>;
    /**
     * Quantize tokens.
     */
    quantize(tokens: string[]): Promise<QuantizationResult>;
    /**
     * Dequantize tokens.
     */
    dequantize(quantizedTokens: QuantizedToken[]): string[];
    /**
     * Apply quantized attention.
     */
    applyQuantizedAttention(query: QuantizedToken[], key: QuantizedToken[], value: QuantizedToken[]): QuantizedToken[];
    /**
     * Cluster tokens for quantization.
     */
    private clusterTokens;
    /**
     * Convert token to numeric value.
     */
    private tokenToValue;
    /**
     * Convert numeric value to token.
     */
    private valueToToken;
    /**
     * Get quantization metadata.
     */
    getMetadata(): Record<string, any>;
}
/**
 * Create Quantizer instance.
 */
export declare function createQuantizer(config?: Partial<QuantizationConfig>): Quantizer;
export declare function getDefaultQuantizer(): Quantizer;
/**
 * Apply 4-bit quantization to tokens.
 */
export declare function apply4BitQuantization(tokens: string[]): Promise<QuantizationResult>;
/**
 * Apply 8-bit quantization to tokens.
 */
export declare function apply8BitQuantization(tokens: string[]): Promise<QuantizationResult>;
