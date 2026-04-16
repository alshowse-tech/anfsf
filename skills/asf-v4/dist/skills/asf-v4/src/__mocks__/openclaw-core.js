"use strict";
/**
 * OpenClaw Core Mock
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.video_generate = void 0;
exports.video_generate = jest.fn().mockResolvedValue({
    status: 'success',
    videoPath: '/videos/mock-output.mp4',
    durationMs: 5000,
    costEstimate: 0.05,
    qualityScore: 0.85,
    metadata: {
        model: 'wan2.6-t2v',
        resolution: '1080P',
        duration: 5,
        aspectRatio: '16:9',
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmNsYXctY29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9fX21vY2tzX18vb3BlbmNsYXctY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7OztBQUVVLFFBQUEsY0FBYyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUN4RCxNQUFNLEVBQUUsU0FBUztJQUNqQixTQUFTLEVBQUUseUJBQXlCO0lBQ3BDLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLFFBQVEsRUFBRTtRQUNSLEtBQUssRUFBRSxZQUFZO1FBQ25CLFVBQVUsRUFBRSxPQUFPO1FBQ25CLFFBQVEsRUFBRSxDQUFDO1FBQ1gsV0FBVyxFQUFFLE1BQU07S0FDcEI7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE9wZW5DbGF3IENvcmUgTW9ja1xuICovXG5cbmV4cG9ydCBjb25zdCB2aWRlb19nZW5lcmF0ZSA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XG4gIHN0YXR1czogJ3N1Y2Nlc3MnLFxuICB2aWRlb1BhdGg6ICcvdmlkZW9zL21vY2stb3V0cHV0Lm1wNCcsXG4gIGR1cmF0aW9uTXM6IDUwMDAsXG4gIGNvc3RFc3RpbWF0ZTogMC4wNSxcbiAgcXVhbGl0eVNjb3JlOiAwLjg1LFxuICBtZXRhZGF0YToge1xuICAgIG1vZGVsOiAnd2FuMi42LXQydicsXG4gICAgcmVzb2x1dGlvbjogJzEwODBQJyxcbiAgICBkdXJhdGlvbjogNSxcbiAgICBhc3BlY3RSYXRpbzogJzE2OjknLFxuICB9LFxufSk7XG4iXX0=