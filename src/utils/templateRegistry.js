import Template1 from '../components/templates/Template1';
import Template2 from '../components/templates/Template2';
import Template3 from '../components/templates/Template3';

export const templates = [
  { name: 'Modèle 1', component: Template1 },
  { name: 'Modèle 2', component: Template2 },
  { name: 'Modèle 3', component: Template3 },
];

export const getTemplate = (templateNumber) => {
  return templates[templateNumber - 1]?.component || templates[0].component; // Default to Template1 if not found
};
