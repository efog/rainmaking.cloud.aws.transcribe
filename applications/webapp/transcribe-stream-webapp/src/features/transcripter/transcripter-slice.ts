import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as uuid from "uuid";

export const LANGUAGES : Record<string, string> = {
    "Canadian French": "fr-CA",
    "US English": "en-US"
}
export const REGIONS : Record<string, string> = {
    "Canada Central 1": "ca-central-1",
    "US East 1": "us-east-1"
}
export const DISCONNECTED: string = "DISCONNECTED";
export const CONNECTED: string = "CONNECTED";
export const CONNECTING: string = "CONNECTING";

export interface TranscripterState {
    region: any,
    sessionId?: string;
    socketState?: string | undefined
}

const initialState: TranscripterState = {
    region: REGIONS.CANADA_CENTRAL_1,
    sessionId: uuid.v4(),
    socketState: DISCONNECTED
};

export const transcripterSlice = createSlice({
    name: "transcripter",
    initialState,
    reducers: {
        setRegion: (state: TranscripterState, action: PayloadAction<string>) => {   
            state.region = action.payload;
        },
        setSessionId: (state: TranscripterState, action: PayloadAction<string>) => {
            state.sessionId = action.payload;
        },
        setSocketState: (state: TranscripterState, action: PayloadAction<string>) => {
            state.socketState = action.payload;
        }
    }
});
export const { setRegion, setSessionId, setSocketState } = transcripterSlice.actions;
export default transcripterSlice.reducer;