import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../services/auth';

type AuthState = {
  user?: User;
  token?: string;
  loading: boolean;
};

const initialState: AuthState = { loading: false };

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    clearAuth(state) {
      state.user = undefined;
      state.token = undefined;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setAuth, clearAuth, setLoading } = slice.actions;
export default slice.reducer;
