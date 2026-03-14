import axios from '../../config/axios';

export const testAPI = {
  getTests: () => axios.get('/tests'),
  getTestById: (id) => axios.get(`/tests/${id}`),
  createTest: (data) => axios.post('/tests', data),
  updateTest: (id, data) => axios.put(`/tests/${id}`, data),
  deleteTest: (id) => axios.delete(`/tests/${id}`),
};
