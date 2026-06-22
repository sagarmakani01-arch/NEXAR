import { Firestore } from '@google-cloud/firestore';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'nexar-app';

let firestore = null;

export async function initializeDatabase() {
  firestore = new Firestore({
    projectId: PROJECT_ID,
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {})
  });

  await ensureCollections();
  console.log('Database initialized (Firestore)');
  return firestore;
}

async function ensureCollections() {
  const collections = ['users', 'projects', 'builds', 'deployments', 'deployment_logs', 'ai_chats', 'project_collaborators'];
  for (const name of collections) {
    const ref = firestore.collection(name);
    const snap = await ref.limit(1).get();
    if (snap.empty) {
      await ref.doc('_seed').set({ _created: new Date().toISOString() });
      await ref.doc('_seed').delete();
    }
  }
}

function doc(collection, id) {
  return firestore.collection(collection).doc(id);
}

function now() {
  return new Date().toISOString();
}

function snapshotToDoc(snap) {
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function queryDocs(collection, queries, orderByField, orderDir = 'desc', limit) {
  let ref = firestore.collection(collection);
  for (const q of queries) {
    ref = ref.where(q.field, q.op, q.value);
  }
  if (orderByField) {
    ref = ref.orderBy(orderByField, orderDir);
  }
  if (limit) {
    ref = ref.limit(limit);
  }
  const snap = await ref.get();
  return snap.docs.map(d => snapshotToDoc(d));
}

export function getPool() {
  return firestore;
}

export const userOps = {
  create: async (id, email, passwordHash, name, provider = null, providerId = null) => {
    await doc('users', id).set({
      email,
      password_hash: passwordHash || null,
      name: name || email?.split('@')[0] || null,
      avatar_url: null,
      provider: provider || null,
      provider_id: providerId || null,
      totp_secret: null,
      totp_enabled: false,
      recovery_codes: null,
      created_at: now(),
      updated_at: now()
    });
  },
  findByEmail: async (email) => {
    const snap = await firestore.collection('users').where('email', '==', email).limit(1).get();
    return snap.empty ? null : snapshotToDoc(snap.docs[0]);
  },
  findByProvider: async (provider, providerId) => {
    const snap = await firestore.collection('users')
      .where('provider', '==', provider)
      .where('provider_id', '==', String(providerId))
      .limit(1).get();
    return snap.empty ? null : snapshotToDoc(snap.docs[0]);
  },
  findById: async (id) => {
    const snap = await doc('users', id).get();
    return snapshotToDoc(snap);
  },
  update: async (id, updates) => {
    const data = { ...updates, updated_at: now() };
    await doc('users', id).update(data);
  }
};

export const projectOps = {
  create: async (project) => {
    await doc('projects', project.id).set({
      user_id: project.userId,
      name: project.name,
      description: project.description || null,
      framework: project.framework || 'vite-react',
      path: project.path,
      status: 'active',
      created_at: now(),
      updated_at: now()
    });
  },
  get: async (id) => {
    const snap = await doc('projects', id).get();
    return snapshotToDoc(snap);
  },
  getByUser: async (userId) => {
    return queryDocs('projects',
      [{ field: 'user_id', op: '==', value: userId }],
      'updated_at', 'desc'
    );
  },
  update: async (id, updates) => {
    const data = { ...updates, updated_at: now() };
    await doc('projects', id).update(data);
  },
  delete: async (id) => {
    await doc('projects', id).delete();
  },
  addCollaborator: async (projectId, userId, role = 'editor') => {
    const collabId = `${projectId}_${userId}`;
    await doc('project_collaborators', collabId).set({
      project_id: projectId,
      user_id: userId,
      role,
      created_at: now()
    });
  },
  getCollaborators: async (projectId) => {
    const snap = await firestore.collection('project_collaborators')
      .where('project_id', '==', projectId).get();
    const collabs = snap.docs.map(d => snapshotToDoc(d));
    const enriched = await Promise.all(collabs.map(async (c) => {
      const user = await userOps.findById(c.user_id);
      return { ...c, email: user?.email || null, name: user?.name || null, avatar_url: user?.avatar_url || null };
    }));
    return enriched;
  },
  removeCollaborator: async (projectId, userId) => {
    const collabId = `${projectId}_${userId}`;
    await doc('project_collaborators', collabId).delete();
  }
};

export const buildOps = {
  create: async (build) => {
    await doc('builds', build.id).set({
      project_id: build.projectId,
      status: build.status || 'building',
      output_path: null,
      error: null,
      started_at: now(),
      completed_at: null
    });
  },
  update: async (id, updates) => {
    await doc('builds', id).update({ ...updates });
  },
  getByProject: async (projectId) => {
    return queryDocs('builds',
      [{ field: 'project_id', op: '==', value: projectId }],
      'started_at', 'desc'
    );
  },
  getLatest: async (projectId) => {
    const results = await queryDocs('builds',
      [{ field: 'project_id', op: '==', value: projectId }],
      'started_at', 'desc', 1
    );
    return results[0] || null;
  }
};

export const deployOps = {
  create: async (deployment) => {
    await doc('deployments', deployment.id).set({
      project_id: deployment.projectId,
      status: deployment.status || 'deploying',
      url: deployment.url || null,
      config: JSON.stringify(deployment.config || {}),
      error: null,
      started_at: now(),
      completed_at: null
    });
  },
  update: async (id, updates) => {
    await doc('deployments', id).update({ ...updates });
  },
  getByProject: async (projectId) => {
    return queryDocs('deployments',
      [{ field: 'project_id', op: '==', value: projectId }],
      'started_at', 'desc'
    );
  },
  getActive: async (projectId) => {
    const results = await queryDocs('deployments',
      [
        { field: 'project_id', op: '==', value: projectId },
        { field: 'status', op: '==', value: 'active' }
      ],
      'started_at', 'desc', 1
    );
    return results[0] || null;
  },
  addLog: async (deploymentId, level, message, metadata) => {
    const logId = `${deploymentId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await doc('deployment_logs', logId).set({
      deployment_id: deploymentId,
      level,
      message,
      metadata: JSON.stringify(metadata || {}),
      created_at: now()
    });
  },
  getLogs: async (deploymentId, limit = 100) => {
    return queryDocs('deployment_logs',
      [{ field: 'deployment_id', op: '==', value: deploymentId }],
      'created_at', 'desc', limit
    );
  }
};

export const chatOps = {
  save: async (chat) => {
    await doc('ai_chats', chat.id).set({
      project_id: chat.projectId || null,
      user_id: chat.userId,
      messages: JSON.stringify(chat.messages),
      model: chat.model || 'ollama-default',
      created_at: now()
    });
  },
  getByProject: async (projectId, limit = 50) => {
    return queryDocs('ai_chats',
      [{ field: 'project_id', op: '==', value: projectId }],
      'created_at', 'desc', limit
    );
  },
  getByUser: async (userId, limit = 50) => {
    return queryDocs('ai_chats',
      [{ field: 'user_id', op: '==', value: userId }],
      'created_at', 'desc', limit
    );
  }
};

export default {
  initialize: initializeDatabase,
  getPool,
  userOps,
  projectOps,
  buildOps,
  deployOps,
  chatOps
};
