import AsyncStorage from "@react-native-async-storage/async-storage";
import { newId } from "@/lib/id";

const KEY = "stemm_local_uid_v1";

export async function getLocalUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;
  const id = await newId();
  await AsyncStorage.setItem(KEY, id);
  return id;
}
