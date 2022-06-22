import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import counterReducer from '../features/counter/counterSlice';
import transcripterReducer from "../features/transcripter/transcripter-slice";
import conversationReducer from "../features/conversation/conversation-slice";

export const store = configureStore({
  reducer: {
    conversation: conversationReducer,
    counter: counterReducer,
    transcripter: transcripterReducer
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
