import { Contract } from "ethers";

import { getProvider } from "../utils/provider";
import { getSigner } from "../utils/signer";

import {
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
} from "../config/contract";

/**
 * Returns a read-only contract instance.
 */
export const getReadContract = () => {
    const provider = getProvider();

    return new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
    );
};

/**
 * Returns a writable contract instance.
 */
export const getWriteContract = async () => {
    const signer = await getSigner();

    return new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
    );
};