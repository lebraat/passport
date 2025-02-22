// src/hooks/__tests__/useMintBadge.test.ts
import { renderHook, act } from "@testing-library/react-hooks";
import { useMintBadge } from "../../hooks/useMintBadge";
import { useAttestation } from "../../hooks/useAttestation";
import { jsonRequest } from "../../utils/AttestationProvider";
import { useMessage } from "../../hooks/useMessage";
import { useNavigateToLastStep } from "../../hooks/useNextCampaignStep";
import { useWeb3ModalAccount } from "@web3modal/ethers/react";

jest.mock("../../hooks/useAttestation");
jest.mock("../../utils/AttestationProvider");
jest.mock("../../hooks/useMessage");
jest.mock("../../hooks/useNextCampaignStep");
jest.mock("@web3modal/ethers/react");

describe("useMintBadge hook", () => {
  const mockGetNonce = jest.fn();
  const mockIssueAttestation = jest.fn();
  const mockJsonRequest = jsonRequest as jest.Mock;
  const mockFailure = jest.fn();
  const mockGoToLastStep = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    (useAttestation as jest.Mock).mockReturnValue({
      getNonce: mockGetNonce,
      issueAttestation: mockIssueAttestation,
    });

    (useWeb3ModalAccount as jest.Mock).mockReturnValue({
      address: "0xTestAddress",
    });

    mockJsonRequest.mockImplementation(() => {});

    (useMessage as jest.Mock).mockReturnValue({
      failure: mockFailure,
    });

    (useNavigateToLastStep as jest.Mock).mockReturnValue(mockGoToLastStep);
  });

  it("handles successful minting", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;
    const testData = { attestation: "testAttestation" };

    mockGetNonce.mockResolvedValue(testNonce);
    mockJsonRequest.mockResolvedValue({ data: testData });
    mockIssueAttestation.mockResolvedValue(true);

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(mockGetNonce).toHaveBeenCalled();
    expect(mockJsonRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        recipient: "0xTestAddress",
      })
    );
    expect(mockIssueAttestation).toHaveBeenCalledWith({ data: testData });
    expect(mockFailure).not.toHaveBeenCalled();
    expect(mockGoToLastStep).toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(true);
  });

  it("shows failure message when nonce is undefined", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];

    mockGetNonce.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(mockGetNonce).toHaveBeenCalled();
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while trying to get the nonce.",
    });
    expect(mockJsonRequest).not.toHaveBeenCalled();
    expect(mockIssueAttestation).not.toHaveBeenCalled();
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });

  it("shows failure message when attestation generation returns an error", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;

    mockGetNonce.mockResolvedValue(testNonce);
    mockJsonRequest.mockResolvedValue({ data: { error: "some error" } });

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(mockGetNonce).toHaveBeenCalled();
    expect(mockJsonRequest).toHaveBeenCalled();
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while generating attestations.",
    });
    expect(mockIssueAttestation).not.toHaveBeenCalled();
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });

  it("shows failure message when issueAttestation throws an error", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;
    const testData = { attestation: "testAttestation" };

    mockGetNonce.mockResolvedValue(testNonce);
    mockJsonRequest.mockResolvedValue({ data: testData });
    mockIssueAttestation.mockRejectedValue(new Error("Attestation failed"));

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(mockGetNonce).toHaveBeenCalled();
    expect(mockJsonRequest).toHaveBeenCalled();
    expect(mockIssueAttestation).toHaveBeenCalledWith({ data: testData });
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while trying to bring the data onchain.",
    });
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });

  it("handles general exception during onMint", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;

    mockGetNonce.mockResolvedValue(testNonce);
    mockJsonRequest.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(mockGetNonce).toHaveBeenCalled();
    expect(mockJsonRequest).toHaveBeenCalled();
    expect(mockIssueAttestation).not.toHaveBeenCalled();
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while trying to bring the data onchain.",
    });
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });
});
