import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as uuid from "uuid";

export const LANGUAGES : Record<string, string> = {
    "Canada Français": "fr-CA",
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
    language: string;
    region: any,
    sessionId?: string;
    socketState?: string | undefined;
    speakerName?: string;
}

const initialState: TranscripterState = {
    language: LANGUAGES["US English"],
    region: REGIONS[ "Canada Central 1"],
    sessionId: uuid.v4(),
    socketState: DISCONNECTED,
    speakerName: "",
};

export const transcripterSlice = createSlice({
    name: "transcripter",
    initialState,
    reducers: {
        setLanguage: (state: TranscripterState, action: PayloadAction<string>) => {
            state.language = action.payload;
        },
        setRegion: (state: TranscripterState, action: PayloadAction<string>) => {   
            state.region = action.payload;
        },
        setSessionId: (state: TranscripterState, action: PayloadAction<string>) => {
            state.sessionId = action.payload;
        },
        setSocketState: (state: TranscripterState, action: PayloadAction<string>) => {
            state.socketState = action.payload;
        },
        setSpeakerName: (state: TranscripterState, action: PayloadAction<string>) => {
            state.speakerName = action.payload;
        }
    }
});
export const { setLanguage, setRegion, setSessionId, setSocketState, setSpeakerName } = transcripterSlice.actions;
export default transcripterSlice.reducer;