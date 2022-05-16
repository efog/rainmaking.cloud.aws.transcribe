import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const DISCONNECTED: string = "DISCONNECTED";
export const CONNECTED: string = "CONNECTED";
export const CONNECTING: string = "CONNECTING";

export interface TranscripterState {
    socketState: string | undefined
}

const initialState: TranscripterState = {
    socketState: DISCONNECTED
};

export const transcripterSlice = createSlice({
    name: "transcriper",
    initialState,
    reducers: {
        setSocketState: (state: TranscripterState, action: PayloadAction<string>) => {
            state.socketState = action.payload;
        }
    }
});
export const { setSocketState } = transcripterSlice.actions;
export default transcripterSlice.reducer;