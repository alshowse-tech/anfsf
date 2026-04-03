"""Layer 8.5 - Governance Control Plane Integration

This module provides integration with the Layer 8.5 governance control plane:
- Ownership Lattice: Provenance and ownership tracking
- Contract Pack: Smart contracts for operation governance
- MCP Bus: Message passing for event propagation
- Readiness Gate: Service health probes
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid
import json
import logging

from models.ownership_record import OwnershipRecord
from models.contract import Contract

logger = logging.getLogger(__name__)


def create_ownership_root(
    db: Session,
    owner_id: uuid.UUID,
    asset_type: str,
    asset_id: uuid.UUID
) -> OwnershipRecord:
    """Create root ownership record for an asset (Layer 8.5 Ownership Lattice)"""
    ownership_record = OwnershipRecord(
        owner_id=owner_id,
        asset_type=asset_type,
        asset_id=asset_id,
        proof_hash=None,  # Would be computed in production
        proof_metadata={"created_by": "system", "provenance": "root"},
        rights={
            "read": True,
            "write": True,
            "execute": True,
            "transfer": True,
            "delete": True
        },
        restrictions={},
        is_active=True,
        is_transferable=True
    )
    db.add(ownership_record)
    db.flush()
    logger.info(f"Created ownership root: {ownership_record.id} for {asset_type}:{asset_id}")
    return ownership_record


def verify_ownership(
    db: Session,
    user_id: uuid.UUID,
    asset_type: str,
    asset_id: uuid.UUID
) -> bool:
    """Verify user owns the specified asset (Layer 8.5 Ownership Lattice)"""
    stmt = db.query(OwnershipRecord).filter(
        OwnershipRecord.owner_id == user_id,
        OwnershipRecord.asset_type == asset_type,
        OwnershipRecord.asset_id == asset_id,
        OwnershipRecord.is_active == True
    )
    
    ownership_record = stmt.first()
    if not ownership_record:
        logger.warning(f"Ownership verification failed: user {user_id} for {asset_type}:{asset_id}")
        return False
    
    logger.debug(f"Ownership verified: user {user_id} owns {asset_type}:{asset_id}")
    return True


def check_contract_validity(contract: Contract) -> bool:
    """Check if contract is valid and enforceable (Layer 8.5 Contract Pack)"""
    if not contract.is_active:
        logger.warning(f"Contract {contract.id} is not active")
        return False
    
    if not contract.is_enforced:
        logger.debug(f"Contract {contract.id} is not enforced")
        return True  # Not enforced but still valid
    
    # Check validity period
    now = datetime.utcnow()
    if contract.valid_from and now < contract.valid_from:
        logger.warning(f"Contract {contract.id} not yet valid (starts {contract.valid_from})")
        return False
    
    if contract.valid_until and now > contract.valid_until:
        logger.warning(f"Contract {contract.id} has expired ({contract.valid_until})")
        return False
    
    logger.debug(f"Contract {contract.id} is valid")
    return True


def publish_to_mcp_bus(event_type: str, payload: Dict[str, Any]) -> bool:
    """Publish event to MCP Bus (Layer 8.5 Message Passing)"""
    try:
        # In production, this would publish to a message queue (Redis, Kafka, etc.)
        # For now, we log the event
        message = {
            "event_type": event_type,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "8.5"
        }
        logger.info(f"MCP Bus Event: {json.dumps(message)}")
        return True
    except Exception as e:
        logger.error(f"Failed to publish to MCP Bus: {e}")
        return False


class ReadinessGate:
    """Layer 8.5 Readiness Gate - Service health probes"""
    
    def __init__(self):
        self.probes = {}
    
    def register_probe(self, name: str, check_func):
        """Register a health probe"""
        self.probes[name] = check_func
        logger.info(f"Registered readiness probe: {name}")
    
    async def check_all(self) -> Dict[str, bool]:
        """Check all registered probes"""
        results = {}
        for name, check_func in self.probes.items():
            try:
                if hasattr(check_func, '__await__'):
                    results[name] = await check_func()
                else:
                    results[name] = check_func()
            except Exception as e:
                logger.error(f"Probe {name} failed: {e}")
                results[name] = False
        
        return results
    
    async def is_ready(self) -> bool:
        """Check if all probes pass"""
        results = await self.check_all()
        return all(results.values())


# Global readiness gate instance
readiness_gate = ReadinessGate()
