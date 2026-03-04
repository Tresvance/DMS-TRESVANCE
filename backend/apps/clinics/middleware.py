"""
Clinic Subdomain Middleware

Automatically detects clinic from subdomain and attaches it to the request.
Works dynamically - no code changes needed when new clinics are created.

Example: libin.tresvance.com -> request.clinic = Clinic(subdomain='libin')
"""
import re
from django.http import JsonResponse
from .models import Clinic


class ClinicSubdomainMiddleware:
    """
    Middleware that extracts clinic from subdomain.
    
    For requests to {subdomain}.tresvance.com:
    - Looks up clinic by subdomain in database
    - Attaches clinic to request.clinic
    - Returns 404 if subdomain doesn't match any clinic
    
    Skips subdomain check for:
    - localhost/127.0.0.1 (development)
    - dmsdental.tresvance.com (main admin site)
    - Direct IP access
    """
    
    # Subdomains that are reserved and should not be treated as clinic subdomains
    RESERVED_SUBDOMAINS = {'www', 'api', 'admin', 'dmsdental', 'mail', 'ftp'}
    
    # Main domain for the application
    MAIN_DOMAIN = 'tresvance.com'
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Initialize clinic as None
        request.clinic = None
        request.clinic_subdomain = None
        
        # Get host from request
        host = request.get_host().lower()
        
        # Remove port if present
        if ':' in host:
            host = host.split(':')[0]
        
        # Skip for localhost/development
        if host in ('localhost', '127.0.0.1') or host.startswith('192.168.'):
            return self.get_response(request)
        
        # Skip for direct IP access
        if re.match(r'^\d+\.\d+\.\d+\.\d+$', host):
            return self.get_response(request)
        
        # Extract subdomain from host
        subdomain = self._extract_subdomain(host)
        
        if subdomain:
            request.clinic_subdomain = subdomain
            
            # Skip reserved subdomains
            if subdomain in self.RESERVED_SUBDOMAINS:
                return self.get_response(request)
            
            # Look up clinic by clinic_code (subdomain stores full domain like "libin.tresvance.com")
            try:
                clinic = Clinic.objects.get(clinic_code__iexact=subdomain, is_active=True)
                request.clinic = clinic
            except Clinic.DoesNotExist:
                # Subdomain doesn't match any clinic
                # For API requests, return JSON error
                if request.path.startswith('/api/'):
                    return JsonResponse({
                        'error': 'clinic_not_found',
                        'message': f"No clinic found for subdomain '{subdomain}'"
                    }, status=404)
                # For other requests, continue (frontend will handle)
        
        return self.get_response(request)
    
    def _extract_subdomain(self, host):
        """
        Extract subdomain from host.
        
        Examples:
        - libin.tresvance.com -> 'libin'
        - dmsdental.tresvance.com -> 'dmsdental'
        - tresvance.com -> None
        - localhost -> None
        """
        # Check if host ends with main domain
        if not host.endswith(self.MAIN_DOMAIN):
            return None
        
        # Remove main domain to get subdomain part
        subdomain_part = host[:-len(self.MAIN_DOMAIN)].rstrip('.')
        
        # No subdomain
        if not subdomain_part:
            return None
        
        # Return the subdomain (first part if nested)
        parts = subdomain_part.split('.')
        return parts[0] if parts else None
