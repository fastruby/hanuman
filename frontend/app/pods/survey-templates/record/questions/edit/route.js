import { hash } from 'rsvp';
import Route from '@ember/routing/route';

export default Route.extend({
  model(params) {
    let surveyTemplate = this.modelFor('survey-templates.record');
    return hash({
      question: this.store.findRecord('question', params.question_id),
      questions: surveyTemplate.get('questions'),
      answerTypes: this.store.findAll('answer-type'),
      dataSources: this.store.findAll('data-source'),
      surveyTemplate
    });
  },

  afterModel(models) {
    let question = models.question;
    if (!question.get('visibilityRule')) {
      this.store.createRecord('rule', { question });
    }
  },

  setupController(controller, models) {
    controller.setProperties(models);
  }
});
