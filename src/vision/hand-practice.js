import {FreePracticeCameraController,FreePracticeEngine} from '../features/free-practice.js';
import {PoseTracker} from './pose-tracker.js';
import {HandForwardAnalyzer} from './hand-forward-analyzer.js';

/**
 * Explicit opt-in only. Never open a second camera beside Pose.
 * If this experimental mode fails, dispose it and present the existing Pose
 * route as a user-initiated fallback, not an automatic permission retry.
 */
export function createHandForwardPractice({mirrorX=true,delegate='CPU',engine,trackerFactory,...options}={}){
  return new FreePracticeCameraController({
    ...options,
    engine:engine??new FreePracticeEngine({analyzer:new HandForwardAnalyzer({mirrorX})}),
    trackerFactory:trackerFactory??((args)=>new PoseTracker({
      ...args,workerInit:{delegate},workerFactory:()=>new Worker(new URL('./hand-worker.js',import.meta.url),{type:'module'}),
    })),
  });
}
