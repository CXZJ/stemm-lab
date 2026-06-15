import type { ActivityConfig } from "@/types/activity-config";

export const parachuteDrop: ActivityConfig = {
  id: "parachute_drop",
  title: "Parachute Drop Challenge",
  subjectArea: "Physics / Engineering",
  description:
    "Compare baseline drops to parachute designs. Record video, measure fall and stopping times, and analyze forces.",
  descriptionSimple:
    "Drop things with and without a parachute. Record video and write what you see.",
  equipment: [
    "Lightweight object",
    "Plastic bag / string / tape",
    "Measuring tape",
    "Phone camera",
  ],
  instructions: `1. Run a baseline drop with no parachute and record video.
2. Build up to 3 parachute prototypes in a 20-minute session.
3. For each test, record video first, then play it back to measure time to first ground contact and (advanced) time until the object stops moving.
4. Compare predictions vs outcomes in the guided flow.
5. Optionally attach extra sketch files below.`,
  instructionsSimple:
    "Try drops without a parachute, then try your designs. Record video, watch it back, and say if your guess was right!",
  timer: { sessionLimitSec: 20 * 60, showStopwatch: true },
  mediaRequirements: [
    {
      id: "drop_video",
      kind: "video",
      required: true,
      label: "Video of test drop/Picture of your sketch if any",
      labelSimple: "Video of your drop/Picture of your sketch if any",
    },
    {
      id: "drop_report_file",
      kind: "file", 
      required: false,
      label: "Upload files of your sketch if any",
      labelSimple: "Upload file of your sketch if any",
    },
  ],
  sensorRequirements: [],
  customFields: [],
  calculations: [
    {
      id: "v_final",
      title: "Final velocity (no-drag model)",
      titleSimple: "Fastest speed estimate",
      formulaKey: "parachute_v_final",
      inputFieldIds: ["dropHeightM"],
    },
  ],
  reflectionPrompts: [
    "Which parachute slowed the fall the most?",
    "What changed between prototypes?",
  ],
  reflectionPromptsSimple: ["What did you change? Did it work?"],
  ratingMaxStars: 5,
  leaderboard: {
    metricFieldId: "timeToGroundSec",
    higherIsBetter: false,
    pointsPerCompletion: 10,
    pointsForImprovement: 5,
  },
  nativeExtension: "parachute_drop",
};

export const soundPollution: ActivityConfig = {
  id: "sound_pollution",
  title: "Sound Pollution Hunter",
  subjectArea: "Physics / Health",
  description:
    "Measure approximate sound levels for classroom actions, map loud/quiet zones, and learn about hearing safety.",
  descriptionSimple: "Find loud and quiet spots. Record sounds and write what you hear.",
  equipment: ["Phone", "Quiet corner", "Objects to make sounds"],
  instructions: `Measure levels for dropping a book, talking, walking, stamping, and custom sounds.
Record dB (approximate if needed), map location, prediction vs outcome, and notes.
Use hearing-risk bands as guidance. Calibrate offset if you know your device bias.`,
  instructionsSimple:
    "Tap record for each sound. Put a dot on the map. Stay safe with loud noises!",
  timer: { showStopwatch: true },
  mediaRequirements: [],
  sensorRequirements: [
    {
      id: "audio_meter",
      kind: "audio_meter",
      required: false,
      label: "Approximate dB meter",
      labelSimple: "Sound meter (approximate)",
    },
  ],
  customFields: [
    {
      id: "customSoundLabel",
      label: "Custom sound label",
      type: "text",
      placeholder: "e.g. Clapping, chair scraping, door slamming",
    },
    {
      id: "calibrationOffsetDb",
      label: "Calibration offset (dB)",
      type: "number",
      unit: "dB",
      advancedOnly: true,
      defaultValue: 0,
    },
    {
      id: "prediction",
      label: "Prediction",
      type: "textarea",
      placeholder: "e.g. We think stamping feet will be the loudest action",
    },
    {
      id: "outcome",
      label: "Outcome",
      type: "textarea",
      placeholder: "e.g. Dropping the book was louder than expected at 85 dB",
    },
    {
      id: "notes",
      label: "Notes",
      type: "textarea",
      placeholder: "e.g. The corner of the room was much quieter than near the door",
    },
  ],
  calculations: [
    {
      id: "db_adj",
      title: "Adjusted level",
      formulaKey: "sound_db_adjusted",
      inputFieldIds: ["dbRaw", "calibrationOffsetDb"],
      advancedOnly: true,
    },
  ],
  reflectionPrompts: [
    "Where were the loudest zones? Why?",
    "How could you reduce noise in the classroom?",
  ],
  reflectionPromptsSimple: ["Where was it loudest?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "dbRaw", higherIsBetter: true },
  nativeExtension: "sound_hunter",
};

export const handFan: ActivityConfig = {
  id: "hand_fan",
  title: "Hand Fan Challenge",
  subjectArea: "Physics / Air Movement",
  description:
    "Test how air movement from different fan designs affects paper and cardboard bending at various distances.",
  descriptionSimple: "Fan paper from different distances and record how much it bends.",
  equipment: ["Paper", "Cardboard", "Scissors", "Sticky tape", "Ruler / protractor"],
  instructions: `1. Stand paper upright on a table.\n2. Fan air from 30cm away.\n3. Observe and record bend angle.\n4. Repeat with different fan designs at 15, 30, and 45cm.\n5. Repeat with cardboard instead of paper.`,
  instructionsSimple: "Stand the paper up. Fan it from different distances. Write how much it bends!",
  timer: { showStopwatch: true },
  mediaRequirements: [
    { 
      id: "photo_bend", 
      kind: "photo", 
      required: false, 
      label: "Photo of bend",
      labelSimple: "Take a photo of the bending paper"
    },
    {
      id: "fan_design_file",
      kind: "file", 
      required: false,
      label: "Upload files",
      labelSimple: "Upload file",
    },
  ],
  sensorRequirements: [],
  customFields: [],
  calculations: [
    {
      id: "stiff",
      title: "Stiffness proxy",
      titleSimple: "Bend helper score",
      formulaKey: "fan_stiffness",
      inputFieldIds: ["bendAngleDeg", "fanDistanceCm"],
      advancedOnly: true,
    },
  ],
  reflectionPrompts: [
    "Which fan design made the paper move the most?",
    "How does material stiffness affect the bend angle?",
    "How does distance from the fan affect bending?",
  ],
  reflectionPromptsSimple: ["Which design worked best? Why?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "bendAngleDeg", higherIsBetter: true },
  nativeExtension: "hand_fan",
};

export const earthquakeStructure: ActivityConfig = {
  id: "earthquake_structure",
  title: "Earthquake-Resistant Structure",
  subjectArea: "Engineering / Waves",
  description:
    "Shake-test structures and record accelerometer motion while comparing designs.",
  descriptionSimple: "Build a tower and see how much the phone shakes.",
  equipment: ["Craft materials", "Phone"],
  instructions: `Describe folds/pillars/supports. Record phone vibration while simulating quake (shake table or hand shake protocol).
Enter movement notes, prediction and result.`,
  instructionsSimple: "Shake your model and watch the numbers.",
  timer: { showStopwatch: true },
  mediaRequirements: [],
  sensorRequirements: [],
  customFields: [
    {
      id: "structureDesign",
      label: "Structure design notes",
      type: "textarea",
      placeholder: "e.g. 4 pillars with accordion folds underneath, flat cardboard platform on top",
    },
    {
      id: "notes",
      label: "Notes",
      type: "textarea",
      placeholder: "e.g. Adding more folds reduced wobble significantly on the second try",
    },
    {
      id: "prediction",
      label: "Prediction",
      type: "textarea",
      placeholder: "e.g. We think more folds will absorb more vibration than more pillars",
    },
    {
      id: "result",
      label: "Result",
      type: "textarea",
      placeholder: "e.g. Structure with 6 folds barely moved compared to the 2-fold design",
    },
  ],
  calculations: [],
  reflectionPrompts: ["Which design felt strongest?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "accelMagnitudeMax", higherIsBetter: false },
  nativeExtension: "earthquake",
};

export const humanPerformance: ActivityConfig = {
  id: "human_performance",
  title: "Human Performance Lab",
  subjectArea: "Biomechanics",
  description:
    "Controlled movement: measure smoothness and speed using motion/vibration sensors.",
  descriptionSimple: "Move smoothly and see your practice scores.",
  equipment: ["Open space", "Phone pocket or armband"],
  instructions: `Perform stretches or controlled moves. Record attempt label, perceived speed, smoothness, ROM, vibration proxy.`,
  instructionsSimple: "Do the move three times. Rate how smooth it felt.",
  timer: { showStopwatch: true },
  mediaRequirements: [],
  sensorRequirements: [],
  customFields: [
    {
      id: "notes",
      label: "Notes",
      type: "textarea",
      placeholder: "e.g. Movement 1 was hardest to keep smooth, arm kept shaking",
    },
  ],
  calculations: [],
  reflectionPrompts: ["How did practice change your smoothness?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "vibrationProxy", higherIsBetter: false },
  nativeExtension: "human_performance",
};

export const reactionBoard: ActivityConfig = {
  id: "reaction_board",
  title: "Reaction Board Challenge",
  subjectArea: "Neuroscience / Physics",
  description:
    "Reaction time, dominant vs non-dominant hand, and tracing accuracy.",
  descriptionSimple: "Tap fast and trace the shape!",
  equipment: ["Phone"],
  instructions: `Complete in-app phases. Each team member saves their own attempt.`,
  instructionsSimple: "Follow the steps on the next screens.",
  timer: { showStopwatch: true },
  mediaRequirements: [],
  sensorRequirements: [],
  customFields: [
    {
      id: "notes",
      label: "Notes",
      type: "textarea",
      placeholder: "e.g. Dominant hand was faster by 80ms, non-dominant hand improved each round",
    },
  ],
  calculations: [
    {
      id: "rx_mean",
      title: "Mean reaction (entered samples)",
      formulaKey: "reaction_mean_ms",
      inputFieldIds: ["handDominantMs", "handOtherMs"],
      advancedOnly: true,
    },
  ],
  reflectionPrompts: ["Was your dominant hand faster?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "traceScore", higherIsBetter: true },
  nativeExtension: "reaction_board",
};

export const breathingPace: ActivityConfig = {
  id: "breathing_pace",
  title: "Breathing Pace Trainer",
  subjectArea: "Physiology",
  description: "Students analyse breathing patterns at rest and after exercise. Place phone on chest to measure breathing rate.",
  descriptionSimple: "Place phone on your chest and count breaths at rest and after exercise.",
  equipment: ["Mobile phone with STEMM Lab app", "Flat surface or mat", "Space to exercise"],
  instructions: `1. Place the phone gently on your chest.\n2. Record breathing at rest.\n3. Jog on the spot for 1 minute then record breathing.\n4. Do 100 star jumps then record breathing again.\nRotate for each team member.`,
  instructionsSimple: "Put the phone on your chest. Breathe normally, then exercise, then count again!",
  timer: { showStopwatch: true },
  mediaRequirements: [],
  sensorRequirements: [],
  customFields: [
    {
      id: "chestNote",
      label: "Chest movement notes",
      type: "textarea",
      advancedOnly: true,
      placeholder: "e.g. Chest rose much higher after exercise, breathing was faster and deeper",
    },
    {
      id: "notes",
      label: "Notes",
      type: "textarea",
      placeholder: "e.g. Took about 2 minutes to return to a normal breathing rate",
    },
  ],
  calculations: [],
  reflectionPrompts: ["How did exercise change your breathing?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "avgBpm", higherIsBetter: false },
  nativeExtension: "breathing",
};

export const ALL_ACTIVITIES: ActivityConfig[] = [
  parachuteDrop,
  soundPollution,
  handFan,
  earthquakeStructure,
  humanPerformance,
  reactionBoard,
  breathingPace,
];

export const ACTIVITY_BY_ID: Record<string, ActivityConfig> = Object.fromEntries(
  ALL_ACTIVITIES.map((a) => [a.id, a]),
);