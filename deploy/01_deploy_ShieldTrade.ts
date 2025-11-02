import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("ShieldTrade", {
    from: deployer,
    log: true,
    // Avoid redeploy if same bytecode already deployed (prevents duplicate nonces)
    skipIfAlreadyDeployed: true,
  });

  console.log(`ShieldTrade contract: `, deployed.address);
};
export default func;
func.id = "deploy_shieldTrade"; // id required to prevent reexecution
func.tags = ["ShieldTrade"];
