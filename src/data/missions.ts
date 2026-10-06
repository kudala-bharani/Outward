import type { Mission } from '../types.ts';

/** Reviewed, finite prompts. The model ranks these; it never writes instructions. */
export const missions: Mission[] = [
  {
    id: 'sound-map', title: 'Make a sound map', kicker: 'TUNE IN',
    description: 'Let the world have the microphone for a minute.',
    instruction: 'From a safe spot, keep your eyes open and notice one sound nearby, one in the middle distance, and one far away. Listen for a sound you had overlooked. No need to identify its source.',
    reflection: 'Which sound made the space feel bigger?',
    tags: ['sound', 'listen', 'grounding', 'overwhelmed'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'listen',
    intent: 'My mind is noisy and scattered. I want to stop overthinking and listen to real sounds around me.'
  },
  {
    id: 'light-collector', title: 'Collect a little light', kicker: 'LOOK SOFTLY',
    description: 'Find three places the light has landed.',
    instruction: 'Look for a patch of light, a patch of shade, and the soft edge between them. Observe from a comfortable position. Never look directly at the sun, even through clouds.',
    reflection: 'Which little patch would you keep?',
    tags: ['light', 'shadow', 'calm', 'screen'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'light',
    intent: 'I have been staring at bright screens. I want gentle natural light, softer attention, and a quiet visual reset.'
  },
  {
    id: 'tiny-world', title: 'Find a tiny world', kicker: 'GET CURIOUS',
    description: 'Something small is doing something interesting.',
    instruction: 'From a safe distance, look for a small detail on a leaf, a wall, a tree, or the ground. Notice its outline and one pattern. Leave plants, insects, and objects where they are; looking is enough.',
    reflection: 'What would you have walked past?',
    tags: ['detail', 'curiosity', 'bored', 'small'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'detail',
    intent: 'I am bored with the same surroundings and want to feel curious again by discovering a tiny surprising detail.'
  },
  {
    id: 'sky-window', title: 'Open a sky window', kicker: 'ZOOM OUT',
    description: 'Give your attention somewhere wider to go.',
    instruction: 'Find a comfortable view of the sky without looking toward the sun. Notice a shape, a color, or a patch of clear space. Let your gaze rest there, then return to the ground around you.',
    reflection: 'What felt different when you looked up?',
    tags: ['sky', 'space', 'perspective', 'stuck'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'sky',
    intent: 'I feel stuck inside my own thoughts. I want open space, a wider perspective, clouds and sky.'
  },
  {
    id: 'color-thread', title: 'Follow a color thread', kicker: 'A SMALL QUEST',
    description: 'Pick one color. See where it turns up.',
    instruction: 'Choose a color you can already see. Along a familiar, accessible route, spot three more versions of it. Stay on public paths and stop before looking closely; the route matters more than finding a match.',
    reflection: 'Where did your color surprise you?',
    tags: ['color', 'play', 'bored', 'wander'], settings: ['neighborhood', 'park'], stationary: false, category: 'detail',
    intent: 'I am restless and bored and want a playful reason to explore familiar places with a simple color scavenger hunt.'
  },
  {
    id: 'texture-gallery', title: 'Visit a texture gallery', kicker: 'EYES ONLY',
    description: 'Rough, smooth, crinkled. No touching required.',
    instruction: 'Find three visible surfaces near you: perhaps bark, brick, a leaf, or a railing. Compare the lines and shapes without touching or approaching anything unfamiliar. Give each texture a word of its own.',
    reflection: 'Which texture had the most character?',
    tags: ['texture', 'detail', 'grounding', 'creative'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'detail',
    intent: 'I want to get out of abstract thoughts and notice concrete details, patterns, and interesting textures with my eyes.'
  },
  {
    id: 'quiet-edge', title: 'Find the quieter edge', kicker: 'TURN IT DOWN',
    description: 'You do not need silence. Just a little less.',
    instruction: 'From a safe, familiar spot, notice which direction sounds calmer. Stay where you are and listen toward it. If it feels comfortable, choose one steady background sound to follow for a minute.',
    reflection: 'What was underneath the loudest sound?',
    tags: ['quiet', 'sound', 'overwhelmed', 'calm'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'listen',
    intent: 'I am overstimulated and overwhelmed by noise and need a calmer quieter moment without any pressure to move.'
  },
  {
    id: 'shadow-shapes', title: 'Read the shadows', kicker: 'A DIFFERENT ANGLE',
    description: 'Ordinary things make extraordinary silhouettes.',
    instruction: 'Look at the ground or a wall for a shadow. Follow its outline with your eyes and notice what made it. If there are no distinct shadows, look for the gentlest change between light and dark.',
    reflection: 'What did the shape remind you of?',
    tags: ['shadow', 'light', 'imagination', 'creative'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'light',
    intent: 'I feel creatively blocked and want an imaginative new angle on ordinary objects through light and shadow.'
  },
  {
    id: 'soft-focus', title: 'Let the view be enough', kicker: 'NO ACHIEVEMENT NEEDED',
    description: 'A pause with absolutely nothing to collect.',
    instruction: 'Choose a safe, comfortable place to sit or stand. Rest your eyes on an ordinary outdoor view. You do not have to count, name, photograph, or improve anything. Stay for as little or as long as feels right.',
    reflection: 'Was there a moment you stopped trying?',
    tags: ['tired', 'rest', 'gentle', 'quiet'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'perspective',
    intent: 'I am tired and drained and have no energy. I want a very gentle low effort pause, just sitting without tasks or achievement.'
  },
  {
    id: 'wind-witness', title: 'Watch the invisible', kicker: 'NOTICE MOTION',
    description: 'You cannot see the breeze. You can see what it does.',
    instruction: 'Look for a leaf, a branch, a flag, or a cloud moving on its own. Watch from your safe spot without following it. If the air is still, notice something that stays surprisingly steady.',
    reflection: 'What gave the air away?',
    tags: ['wind', 'motion', 'nature', 'calm'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'movement',
    intent: 'I want to slow down, watch natural movement, notice a breeze, and let something else set the pace.'
  },
  {
    id: 'familiar-detour', title: 'Take the familiar detour', kicker: 'CHANGE THE SCENE',
    description: 'Same neighborhood. Slightly different attention.',
    instruction: 'Choose a short, familiar, accessible route and a clear turnaround point. Move at your own comfortable pace. Notice one thing on the way out and a different thing on the way back. Keep crossings and traffic your first priority.',
    reflection: 'What changed when you came back?',
    tags: ['restless', 'movement', 'walk', 'reset'], settings: ['neighborhood', 'park'], stationary: false, category: 'movement',
    intent: 'I have been sitting all day and feel restless. I want to move, take a short walk or roll, and change my surroundings.'
  },
  {
    id: 'doorstep-distance', title: 'Travel with your eyes', kicker: 'STAY RIGHT HERE',
    description: 'A tiny adventure from one comfortable spot.',
    instruction: 'From your doorstep or another safe outdoor spot, notice something near, something farther away, and something at the edge of your view. Shift your gaze between them at a comfortable pace. Stay clear of steps and doorways.',
    reflection: 'How much world fit into one spot?',
    tags: ['stationary', 'accessible', 'perspective', 'gentle'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'perspective',
    intent: 'I cannot or do not want to go far. I want a small accessible outdoor change of perspective while staying in one place.'
  },
  {
    id: 'bird-pause', title: 'Wait for a wingbeat', kicker: 'LET IT ARRIVE',
    description: 'No chasing. Just a little patient noticing.',
    instruction: 'Stay on a public path or in your own outdoor space and watch for a distant bird. Notice its movement or listen for a call. Do not approach, feed, or disturb wildlife. No birds today? A moving leaf counts.',
    reflection: 'What arrived when you stopped searching?',
    tags: ['birds', 'nature', 'patience', 'listen'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'listen',
    intent: 'I want to feel connected to nature and watch birds or listen to birdsong without disturbing wildlife.'
  },
  {
    id: 'three-greens', title: 'Discover three greens', kicker: 'NATURE HAS RANGE',
    description: 'Green is rarely just one color.',
    instruction: 'Look for three shades in nearby plants without leaving the path or touching them. If there is little green around, use three shades of any color in the landscape instead. Compare what light and distance change.',
    reflection: 'Which shade did you almost miss?',
    tags: ['plants', 'green', 'nature', 'color'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'detail',
    intent: 'I miss greenery and want to notice plants, leaves, and natural colors around me.'
  },
  {
    id: 'slow-loop', title: 'Make a very small loop', kicker: 'YOUR OWN PACE',
    description: 'A little movement, without a destination.',
    instruction: 'Choose a short, level, familiar public path with an easy return. Walk or roll at a comfortable pace, paying attention to the route. Pause somewhere safe to notice what sounds or colors changed. Turn back whenever you want.',
    reflection: 'Where did you naturally want to pause?',
    tags: ['movement', 'restless', 'walk', 'gentle'], settings: ['neighborhood', 'park'], stationary: false, category: 'movement',
    intent: 'I have excess restless energy and want a gentle short walk or roll, a little movement with no exercise target.'
  },
  {
    id: 'cloud-story', title: 'Find a cloud story', kicker: 'MAKE ROOM FOR PLAY',
    description: 'A passing shape needs no correct answer.',
    instruction: 'From a comfortable position, look at a patch of sky well away from the sun. Find a shape in a cloud and imagine what it resembles. With no clouds, try the outline of a tree or roof instead.',
    reflection: 'What was your wonderfully wrong answer?',
    tags: ['cloud', 'imagination', 'play', 'creative'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'sky',
    intent: 'I want to play, use my imagination, and be less serious by making up shapes and stories in clouds.'
  },
  {
    id: 'ordinary-beauty', title: 'Notice an ordinary good thing', kicker: 'SMALL IS PLENTY',
    description: 'Not everything needs to be spectacular.',
    instruction: 'Let your attention settle on one ordinary detail you like, even a little: a color, a shape, a sound, or a patch of green. It is okay if nothing feels special. Simply notice what is there without forcing a feeling.',
    reflection: 'What was worth one extra second?',
    tags: ['gentle', 'low', 'beauty', 'ordinary'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'perspective',
    intent: 'I feel flat or low and want a gentle moment of ordinary beauty, without forced positivity or pressure to feel better.'
  },
  {
    id: 'street-rhythm', title: 'Hear the street rhythm', kicker: 'THE EVERYDAY SOUNDTRACK',
    description: 'A place has a rhythm of its own.',
    instruction: 'Pause well away from traffic and crossings. Listen for a repeating sound: footsteps, a distant engine, rain, or rustling. Keep your eyes open and remain aware of your surroundings. Notice the quiet gaps too.',
    reflection: 'What was keeping time?',
    tags: ['sound', 'city', 'rhythm', 'listen'], settings: ['neighborhood', 'doorstep'], stationary: true, category: 'listen',
    intent: 'I want to reconnect with the neighborhood and hear everyday city sounds and the rhythm of life around me.'
  },
  {
    id: 'branch-lines', title: 'Trace a branching line', kicker: 'FOLLOW THE PATTERN',
    description: 'Nature rarely draws a straight line.',
    instruction: 'Look at a tree from a safe distance. Follow one branch with your eyes from its base to a smaller twig. Do not climb or touch. If there is no tree nearby, trace a visible line in a wall or paving instead.',
    reflection: 'Where did the line do something unexpected?',
    tags: ['trees', 'pattern', 'focus', 'nature'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'detail',
    intent: 'My attention is scattered and I want one simple visual focus, tracing natural patterns and branches.'
  },
  {
    id: 'open-horizon', title: 'Find the widest view', kicker: 'A LITTLE BREATHING ROOM',
    description: 'Your view can be bigger than your to-do list.',
    instruction: 'On a familiar, accessible public route, choose a safe stopping point with an open view. Notice the closest and farthest parts of the landscape. Stay at ground level and well back from roads, water, or edges.',
    reflection: 'What helped the view feel open?',
    tags: ['space', 'perspective', 'stuck', 'wander'], settings: ['neighborhood', 'park'], stationary: false, category: 'perspective',
    intent: 'I feel boxed in and stuck at a desk. I want a change of scene, open space and a wider view outdoors.'
  },
  {
    id: 'weather-minute', title: 'Meet this exact minute', kicker: 'HERE, TODAY',
    description: 'The weather is making a one-time-only version of this place.',
    instruction: 'From a safe sheltered spot if needed, notice the light, the movement of the air, and what the weather looks like on nearby surfaces. Stay inside if conditions are unsafe; you can observe through a window instead.',
    reflection: 'What made this minute different from yesterday?',
    tags: ['weather', 'present', 'grounding', 'light'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'light',
    intent: 'I have lost track of the day indoors and want to reconnect with the actual weather, daylight, and present moment.'
  },
  {
    id: 'one-thing-changing', title: 'Watch one thing change', kicker: 'SLOW IS STILL SOMETHING',
    description: 'There is no need to make anything happen.',
    instruction: 'Choose a safe outdoor view and watch one small change: a cloud drifting, a leaf moving, or a shadow shifting. If nothing changes, let stillness be what you notice. You can stay seated the whole time.',
    reflection: 'What changed without your help?',
    tags: ['rest', 'slow', 'tired', 'patience'], settings: ['neighborhood', 'park', 'doorstep'], stationary: true, category: 'movement',
    intent: 'I am exhausted from doing too much and want to sit still while the world moves, without needing to accomplish anything.'
  },
];

export const MISSIONS = missions;
