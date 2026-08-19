import usersData from '../data/users/users.json';
import projectsData from '../data/projects/projects.json';
import fundraisersData from '../data/fundraisers/fundraisers.json';
import activitiesData from '../data/activities/activities.json';

export const getInitialData = () => ({
  users: usersData,
  projects: projectsData,
  fundraisers: fundraisersData,
  activities: activitiesData,
});

export const STORAGE_KEY = 'hmsi_portal_data';

export const loadData = () => {
  if (typeof window === 'undefined') return getInitialData();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored data', e);
    }
  }
  return getInitialData();
};

export const saveData = (data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};
