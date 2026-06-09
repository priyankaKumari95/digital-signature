import api from './client';

const unwrap = (p) => p.then((res) => res.data.data);

export const authApi = {
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  me: () => unwrap(api.get('/auth/me')),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
};

export const documentApi = {
  list: (params) => unwrap(api.get('/documents', { params })),
  get: (id) => unwrap(api.get(`/documents/${id}`)).then((d) => d.document),
  upload: (file, title, onUploadProgress) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return unwrap(api.post('/documents', form, { onUploadProgress })).then((d) => d.document);
  },
  sign: (id, payload) => unwrap(api.post(`/documents/${id}/sign`, payload)).then((d) => d.document),
  remove: (id) => unwrap(api.delete(`/documents/${id}`)),
  fileBlob: (id, variant = 'original') =>
    api
      .get(`/documents/${id}/file`, { params: { variant }, responseType: 'blob' })
      .then((r) => r.data),
  downloadBlob: (id, variant = 'signed') =>
    api
      .get(`/documents/${id}/download`, { params: { variant }, responseType: 'blob' })
      .then((r) => r.data),
};

export const signatureApi = {
  list: () => unwrap(api.get('/signatures')).then((d) => d.signatures),
  create: (payload) => unwrap(api.post('/signatures', payload)).then((d) => d.signature),
  remove: (id) => unwrap(api.delete(`/signatures/${id}`)),
};

export const verifyApi = {
  verify: (verificationId) => unwrap(api.get(`/verify/${verificationId}`)),
  downloadUrl: (verificationId) => `${api.defaults.baseURL}/verify/${verificationId}/download`,
};

export const adminApi = {
  stats: () => unwrap(api.get('/admin/stats')),
  users: (params) => unwrap(api.get('/admin/users', { params })),
  updateUser: (id, payload) => unwrap(api.patch(`/admin/users/${id}`, payload)).then((d) => d.user),
  documents: (params) => unwrap(api.get('/admin/documents', { params })),
  auditLogs: (params) => unwrap(api.get('/admin/audit-logs', { params })),
};
