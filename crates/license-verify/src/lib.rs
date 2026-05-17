use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum VerifyError {
    #[error("token invalido o firma errata: {0}")]
    InvalidToken(String),
    #[error("token scaduto")]
    Expired,
    #[error("issuer non corrispondente")]
    IssuerMismatch,
    #[error("chiave pubblica non parsabile: {0}")]
    InvalidKey(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseClaims {
    pub sub: String,
    pub code: String,
    pub product: String,
    pub tier: String,
    pub machine: String,
    pub lic_exp: i64,
    pub exp: i64,
    pub iat: i64,
    pub iss: String,
}

impl LicenseClaims {
    pub fn license_expired(&self, now_unix: i64) -> bool {
        self.lic_exp < now_unix
    }

    pub fn requires_tier(&self, required: &str) -> bool {
        match (self.tier.as_str(), required) {
            ("lifetime", _) => true,
            ("pro", "pro") | ("pro", "standard") => true,
            ("standard", "standard") => true,
            _ => false,
        }
    }
}

const EXPECTED_ISSUER: &str = "drilonhametaj.it";

pub fn verify(token: &str, public_key_pem: &[u8]) -> Result<LicenseClaims, VerifyError> {
    let key = DecodingKey::from_rsa_pem(public_key_pem)
        .map_err(|e| VerifyError::InvalidKey(e.to_string()))?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_issuer(&[EXPECTED_ISSUER]);
    validation.leeway = 60;
    let decoded = decode::<LicenseClaims>(token, &key, &validation).map_err(|e| {
        use jsonwebtoken::errors::ErrorKind::*;
        match e.kind() {
            ExpiredSignature => VerifyError::Expired,
            InvalidIssuer => VerifyError::IssuerMismatch,
            _ => VerifyError::InvalidToken(e.to_string()),
        }
    })?;
    Ok(decoded.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_hierarchy() {
        let mut claims = LicenseClaims {
            sub: "x".into(),
            code: "x".into(),
            product: "x".into(),
            tier: "lifetime".into(),
            machine: "x".into(),
            lic_exp: 0,
            exp: 0,
            iat: 0,
            iss: EXPECTED_ISSUER.into(),
        };
        assert!(claims.requires_tier("pro"));
        assert!(claims.requires_tier("standard"));
        claims.tier = "pro".into();
        assert!(claims.requires_tier("pro"));
        assert!(claims.requires_tier("standard"));
        claims.tier = "standard".into();
        assert!(!claims.requires_tier("pro"));
        assert!(claims.requires_tier("standard"));
    }
}
