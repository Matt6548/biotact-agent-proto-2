export const STORY_CHAPTERS=[
  {
    id:1,
    title:"Flame Discipline",
    mission:"Deflect the flame",
    brief:"Learn to move the virtual flame with a clean, repeatable line. Raw speed alone is not the goal.",
  },
  {
    id:2,
    title:"Control the Disturbance",
    mission:"Make the flame unstable",
    brief:"Create a stronger air disturbance while keeping the strike line controlled and repeatable.",
  },
  {
    id:3,
    title:"Extinguish",
    mission:"Extinguish the flame",
    brief:"Combine your calibrated speed reference and line quality to extinguish the virtual target.",
  },
  {
    id:4,
    title:"Distance",
    mission:"Extinguish from longer virtual range",
    brief:"Keep the same control as the virtual target moves farther away. Distance here is a training model, not a physical measurement.",
  },
];

export function storyForLevel(id){
  const numeric=Number(id);
  return STORY_CHAPTERS.find((chapter)=>chapter.id===numeric)??STORY_CHAPTERS.at(-1);
}
