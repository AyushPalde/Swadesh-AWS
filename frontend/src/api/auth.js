
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';

import { auth } from '../firebase.js';

export async function login({ email, password }) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const token = await result.user.getIdToken();

  return {
    token,
    user: {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName || '',
    },
  };
}

export async function register({ name, email, password }) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });

  return {
    token: await result.user.getIdToken(),
    user: {
      uid: result.user.uid,
      email: result.user.email,
      name,
    },
  };
}

export async function logout() {
  await signOut(auth);
}

export default { login, register, logout };
