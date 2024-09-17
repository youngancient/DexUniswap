import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MyDexModule = buildModule("MyDexModule", (m) => {
 
  const myDex = m.contract("MyDex");

  return { myDex };
});

export default MyDexModule;
