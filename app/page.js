import dynamic from "next/dynamic";

const AuraMinusApp = dynamic(() => import("../components/AuraMinusApp"), {
  ssr: false
});

export default function Home() {
  return <AuraMinusApp />;
}