export const prompts = [
  {
    id: '1',
    text: 'What made today meaningful?',
    category: 'reflection' as const
  },
  {
    id: '2', 
    text: 'What challenged you today?',
    category: 'challenge' as const
  },
  {
    id: '3',
    text: 'What are you grateful for?',
    category: 'gratitude' as const
  },
  {
    id: '4',
    text: 'What did you learn about yourself today?',
    category: 'reflection' as const
  },
  {
    id: '5',
    text: 'How did you grow today?',
    category: 'reflection' as const
  },
  {
    id: '6',
    text: 'What moments brought you joy?',
    category: 'gratitude' as const
  },
  {
    id: '7',
    text: 'What would you do differently?',
    category: 'reflection' as const
  },
  {
    id: '8',
    text: 'Who impacted your day positively?',
    category: 'gratitude' as const
  }
];

export const getRandomPrompt = () => {
  const randomIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomIndex];
};

export const getDailyPrompt = (date: Date = new Date()) => {
  // Use date as seed for consistent daily prompt
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const promptIndex = dayOfYear % prompts.length;
  return prompts[promptIndex];
};