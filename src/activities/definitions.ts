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
    "Timer",
  ],
  instructions: `1. Run a baseline drop with no parachute and record video.
2. Build up to 3 parachute prototypes in a 20-minute session.
3. For each test, record time to first ground contact and use slow-motion to estimate time until the object stops moving.
4. Enter mass, drop height, landing notes, and target accuracy.
5. Rate each design and record predictions vs outcomes.`,
  instructionsSimple:
    "Try drops without a parachute, then try your designs. Use the timer and camera. Say if your guess was right!",
  timer: { sessionLimitSec: 20 * 60, showStopwatch: true },
  mediaRequirements: [
    {
      id: "drop_video",
      kind: "video",
      required: true,
      label: "Video of test drop",
      labelSimple: "Video of your drop",
    },
  ],
  sensorRequirements: [],
  customFields: [
    {
      id: "prototypeIndex",
      label: "Prototype # (1–3)",
      labelSimple: "Which try (1, 2, or 3)?",
      type: "select",
      options: [
        { value: "1", label: "Prototype 1" },
        { value: "2", label: "Prototype 2" },
        { value: "3", label: "Prototype 3" },
      ],
    },
    {
      id: "hasParachute",
      label: "Using parachute?",
      type: "boolean",
      defaultValue: true,
    },
    { id: "massKg", label: "Mass (kg)", type: "number", unit: "kg", step: 0.01 },
    {
      id: "dropHeightM",
      label: "Drop height (m)",
      type: "number",
      unit: "m",
      step: 0.01,
    },
    {
      id: "timeToGroundSec",
      label: "Time to first ground contact (s)",
      type: "number",
      unit: "s",
      step: 0.001,
    },
    {
      id: "timeToStopSec",
      label: "Time until stopped moving (s, slow-mo)",
      type: "number",
      unit: "s",
      step: 0.001,
      advancedOnly: true,
    },
    {
      id: "bounceMode",
      label: "Landing style",
      type: "select",
      options: [
        { value: "no_bounce", label: "No bounce (sticks)" },
        { value: "bounce", label: "Bounce / roll" },
      ],
    },
    {
      id: "impactSpeedMs",
      label: "Impact speed estimate (m/s)",
      type: "number",
      unit: "m/s",
      advancedOnly: true,
    },
    {
      id: "measuredAccel",
      label: "Measured average accel (m/s²)",
      type: "number",
      unit: "m/s²",
      advancedOnly: true,
    },
    {
      id: "deltaVStop",
      label: "Speed change during stop (m/s)",
      type: "number",
      unit: "m/s",
      advancedOnly: true,
    },
    {
      id: "deltaTStop",
      label: "Stopping duration (s)",
      type: "number",
      unit: "s",
      advancedOnly: true,
    },
    {
      id: "targetAccuracy",
      label: "Target accuracy notes",
      type: "textarea",
    },
    {
      id: "landingNotes",
      label: "Landing notes",
      type: "textarea",
    },
    {
      id: "designRating",
      label: "Design rating (1–5)",
      type: "number",
      min: 1,
      max: 5,
    },
    {
      id: "prediction",
      label: "Team prediction",
      type: "textarea",
    },
    {
      id: "predictionCorrect",
      label: "Was the prediction correct?",
      type: "boolean",
    },
  ],
  calculations: [
    {
      id: "v_final",
      title: "Final velocity (no-drag model)",
      titleSimple: "Fastest speed estimate",
      formulaKey: "parachute_v_final",
      inputFieldIds: ["dropHeightM"],
    },
    {
      id: "accel",
      title: "Acceleration from measurements",
      formulaKey: "parachute_accel",
      inputFieldIds: ["impactSpeedMs", "dropHeightM"],
      advancedOnly: true,
    },
    {
      id: "f_net",
      title: "Net force",
      formulaKey: "parachute_net_force",
      inputFieldIds: ["massKg", "measuredAccel"],
      advancedOnly: true,
    },
    {
      id: "f_drag",
      title: "Drag force estimate",
      formulaKey: "parachute_drag",
      inputFieldIds: ["massKg", "measuredAccel"],
      advancedOnly: true,
    },
    {
      id: "g_stop",
      title: "Stopping g-force",
      formulaKey: "parachute_g_stop",
      inputFieldIds: ["deltaVStop", "deltaTStop"],
      advancedOnly: true,
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
  mediaRequirements: [
    {
      id: "sound_clip",
      kind: "audio",
      required: false,
      label: "Optional audio sample",
    },
  ],
  sensorRequirements: [
    {
      id: "audio_meter",
      kind: "audio_meter",
      required: false,
      label: "Approximate dB meter",
      labelSimple: "Sound meter (approximate)",
    },
    { id: "gps_tag", kind: "gps", required: false, label: "GPS tag for outdoor map" },
  ],
  customFields: [
    {
      id: "soundAction",
      label: "Action",
      type: "select",
      options: [
        { value: "book", label: "Drop book" },
        { value: "talk", label: "Talking" },
        { value: "walk", label: "Walking" },
        { value: "stamp", label: "Stamp feet" },
        { value: "custom", label: "Custom" },
      ],
    },
    { id: "customSoundLabel", label: "Custom sound label", type: "text" },
    {
      id: "dbRaw",
      label: "Measured level (approx dB)",
      type: "number",
      unit: "dB",
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
      id: "readingLabel",
      label: "Reading type",
      type: "select",
      options: [
        { value: "calibrated", label: "Calibrated" },
        { value: "approximate", label: "Approximate / uncalibrated" },
      ],
    },
    { id: "roomX", label: "Room map X (0–1)", type: "number", min: 0, max: 1, step: 0.01 },
    { id: "roomY", label: "Room map Y (0–1)", type: "number", min: 0, max: 1, step: 0.01 },
    { id: "prediction", label: "Prediction", type: "textarea" },
    { id: "outcome", label: "Outcome", type: "textarea" },
    { id: "notes", label: "Notes", type: "textarea" },
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
  subjectArea: "Forces / Materials",
  description:
    "Compare bending of paper or cardboard with different fan speeds and distances.",
  descriptionSimple: "See how far the fan is and how much the paper bends.",
  equipment: ["Paper / cardboard", "Fan", "Ruler / protractor"],
  instructions: `Set fan distances 15, 30, and 45 cm. Record material, bend angle, notes, predictions and results.`,
  instructionsSimple: "Try different distances. Write the bend angle.",
  timer: { showStopwatch: true },
  mediaRequirements: [
    { id: "photo_bend", kind: "photo", required: false, label: "Photo of bend" },
  ],
  sensorRequirements: [],
  customFields: [
    {
      id: "materialType",
      label: "Material",
      type: "select",
      options: [
        { value: "paper", label: "Paper" },
        { value: "cardboard", label: "Cardboard" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "fanDistanceCm",
      label: "Fan distance",
      type: "select",
      options: [
        { value: "15", label: "15 cm" },
        { value: "30", label: "30 cm" },
        { value: "45", label: "45 cm" },
      ],
    },
    { id: "bendAngleDeg", label: "Bend angle (°)", type: "number", unit: "°" },
    { id: "notes", label: "Notes", type: "textarea" },
    { id: "prediction", label: "Prediction", type: "textarea" },
    { id: "result", label: "Result", type: "textarea" },
  ],
  calculations: [
    {
      id: "stiff",
      title: "Stiffness proxy",
      titleSimple: "Bend helper score",
      formulaKey: "fan_stiffness",
      inputFieldIds: ["bendAngleDeg", "fanDistanceCm"],
    },
  ],
  reflectionPrompts: ["Which material bent more? Why?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "bendAngleDeg", higherIsBetter: true },
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
  mediaRequirements: [
    { id: "structure_photo", kind: "photo", required: false, label: "Structure photo" },
  ],
  sensorRequirements: [
    {
      id: "accel",
      kind: "accelerometer",
      required: false,
      label: "Accelerometer sample",
    },
  ],
  customFields: [
    { id: "structureDesign", label: "Structure design notes", type: "textarea" },
    { id: "foldCount", label: "Number of folds", type: "number", min: 0 },
    { id: "pillarCount", label: "Number of pillars", type: "number", min: 0 },
    {
      id: "movementAmount",
      label: "Observed movement amount (0–10)",
      type: "number",
      min: 0,
      max: 10,
    },
    {
      id: "accelMagnitudeMax",
      label: "Peak acceleration magnitude (m/s²)",
      type: "number",
      advancedOnly: true,
    },
    { id: "notes", label: "Notes", type: "textarea" },
    { id: "prediction", label: "Prediction", type: "textarea" },
    { id: "result", label: "Result", type: "textarea" },
  ],
  calculations: [],
  reflectionPrompts: ["Which design felt strongest?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "accelMagnitudeMax", higherIsBetter: false },
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
  mediaRequirements: [
    { id: "move_video", kind: "video", required: false, label: "Optional movement video" },
  ],
  sensorRequirements: [
    {
      id: "motion",
      kind: "motion_smoothness",
      required: false,
      label: "Motion smoothness sample",
    },
  ],
  customFields: [
    { id: "attemptLabel", label: "Attempt name", type: "text" },
    { id: "speedScore", label: "Speed (1–10)", type: "number", min: 1, max: 10 },
    { id: "smoothnessScore", label: "Smoothness (1–10)", type: "number", min: 1, max: 10 },
    { id: "romDeg", label: "Range of motion (° est.)", type: "number", advancedOnly: true },
    {
      id: "vibrationProxy",
      label: "Vibration proxy (avg mag)",
      type: "number",
      advancedOnly: true,
    },
    { id: "notes", label: "Notes", type: "textarea" },
  ],
  calculations: [],
  reflectionPrompts: ["How did practice change your smoothness?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "smoothnessScore", higherIsBetter: true },
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
    { id: "memberName", label: "Team member first name", type: "text" },
    { id: "handDominantMs", label: "Dominant hand avg (ms)", type: "number", advancedOnly: true },
    { id: "handOtherMs", label: "Other hand avg (ms)", type: "number", advancedOnly: true },
    { id: "traceScore", label: "Trace score (0–100)", type: "number", min: 0, max: 100 },
    { id: "notes", label: "Notes", type: "textarea" },
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
  description:
    "Record breathing rate at rest and after exercise rounds for one member at a time.",
  descriptionSimple: "Count breaths with the timer.",
  equipment: ["Timer", "Space to exercise"],
  instructions: `Measure rest, after exercise 1, after exercise 2. Optionally record chest movement notes.`,
  instructionsSimple: "Rest, then exercise, then count breaths again.",
  timer: { showStopwatch: true },
  mediaRequirements: [],
  sensorRequirements: [],
  customFields: [
    { id: "memberName", label: "Team member measured", type: "text" },
    {
      id: "phase",
      label: "Phase",
      type: "select",
      options: [
        { value: "rest", label: "At rest" },
        { value: "after_ex1", label: "After exercise 1" },
        { value: "after_ex2", label: "After exercise 2" },
      ],
    },
    { id: "breathCount", label: "Breaths counted", type: "number", min: 0 },
    { id: "sampleDurationSec", label: "Sample duration (s)", type: "number", min: 1 },
    { id: "chestNote", label: "Chest movement notes", type: "textarea", advancedOnly: true },
    { id: "prediction", label: "Prediction", type: "textarea" },
    { id: "result", label: "Result", type: "textarea" },
    { id: "notes", label: "Notes", type: "textarea" },
  ],
  calculations: [
    {
      id: "bpm",
      title: "Breaths per minute",
      titleSimple: "Breaths per minute",
      formulaKey: "breathing_bpm",
      inputFieldIds: ["breathCount", "sampleDurationSec"],
    },
  ],
  reflectionPrompts: ["How did exercise change your breathing?"],
  ratingMaxStars: 5,
  leaderboard: { metricFieldId: "breathCount", higherIsBetter: false },
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
