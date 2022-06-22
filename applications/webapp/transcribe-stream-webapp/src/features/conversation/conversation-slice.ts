import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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
            state.messages = action.payload;
        },
    }
});
export const { setMessages } = conversationSlice.actions;
export default conversationSlice.reducer;