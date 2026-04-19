import { sampleCalibrationWords } from "@/lib/hsk";
import { getKnownCount } from "./actions";
import { Calibrate } from "./Calibrate";

export const dynamic = "force-dynamic";

export default async function CalibratePage() {
  const words = sampleCalibrationWords(8);
  const existing = await getKnownCount();
  return <Calibrate words={words} alreadyKnownCount={existing} />;
}
