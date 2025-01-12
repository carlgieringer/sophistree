import { AddMediaExcerptData } from "../store/entitiesSlice";

export interface AddMediaExcerptMessage {
  action: "addMediaExcerpt";
  data: AddMediaExcerptData;
}

export interface SelectMediaExcerptMessage {
  action: "selectMediaExcerpt";
  data: {
    mediaExcerptId: string;
  };
}

export interface GetMediaExcerptMessage {
  action: "getMediaExcerpt";
  data: {
    mediaExcerptId: string;
  };
}

export interface GetMediaExcerptsMessage {
  action: "getMediaExcerpts";
  data: {
    url: string;
    canonicalUrl?: string;
    pdfFingerprint?: string;
  };
}

export interface AuthStateChangedMessage {
  action: "authStateChanged";
}

export type ChromeRuntimeMessage =
  | AddMediaExcerptMessage
  | SelectMediaExcerptMessage
  | GetMediaExcerptMessage
  | GetMediaExcerptsMessage
  | AuthStateChangedMessage;
