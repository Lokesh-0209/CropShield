from enum import Enum
from typing import Dict, Set


class CaseStatus(str, Enum):
    """Supported lifecycle statuses for a CropShield case."""
    PENDING_ANALYSIS = "PENDING_ANALYSIS"
    ANALYZED = "ANALYZED"
    NEEDS_VERIFICATION = "NEEDS_VERIFICATION"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    MORE_INFO_REQUIRED = "MORE_INFO_REQUIRED"


class VerificationStatus(str, Enum):
    """Allowed officer verification outcomes from NEEDS_VERIFICATION."""
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    MORE_INFO_REQUIRED = "MORE_INFO_REQUIRED"


# Explicit state transition graph
ALLOWED_TRANSITIONS: Dict[CaseStatus, Set[CaseStatus]] = {
    CaseStatus.PENDING_ANALYSIS: {CaseStatus.ANALYZED},
    CaseStatus.ANALYZED: {CaseStatus.NEEDS_VERIFICATION},
    CaseStatus.NEEDS_VERIFICATION: {
        CaseStatus.VERIFIED,
        CaseStatus.REJECTED,
        CaseStatus.MORE_INFO_REQUIRED,
    },
    CaseStatus.MORE_INFO_REQUIRED: {CaseStatus.NEEDS_VERIFICATION},
    CaseStatus.VERIFIED: set(),
    CaseStatus.REJECTED: set(),
}
