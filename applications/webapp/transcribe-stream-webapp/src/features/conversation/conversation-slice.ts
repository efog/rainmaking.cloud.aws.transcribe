import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import { Transcript } from "./Conversation";

type ConversationState = {
    messages: Transcript[]
}

const initialState: ConversationState = {
    messages: []
};

export const conversationSlice = createSlice({
    name: "transcripter",
    initialState,
    reducers: {
        setMessages: (state: ConversationState, action: PayloadAction<Transcript[]>) => {
            state.messages = action.payload.sort((a: Transcript, b: Transcript) => {
                const ta = DateTime.fromISO(a.eventTimestamp || "");
                const tb = DateTime.fromISO(b.eventTimestamp || "");
                return ta < tb ? 1 : -1;
            });
        },
    }
});
export const { setMessages } = conversationSlice.actions;
export default conversationSlice.reducer;