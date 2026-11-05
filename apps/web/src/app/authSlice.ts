import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserProfile {
  uid: string;
  email?: string;
  role: string;
  companyId: string;
  branchIds: string[];
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Seed the app with default mock company admin details for easy local developer testing
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserProfile; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
