from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import User, UserPasswordHistory


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']     = user.email
        token['role']      = user.role
        token['full_name'] = user.get_full_name()
        token['clinic_id'] = user.clinic_id
        
        # Check if password needs to be changed
        must_change = False
        if user.force_password_change:
            must_change = True
        elif user.password_last_changed:
            if timezone.now() > user.password_last_changed + timedelta(days=90):
                must_change = True
        else:
            must_change = True
            
        token['must_change_password'] = must_change
        return token

    def validate(self, attrs):
        email = attrs.get(User.USERNAME_FIELD)
        user_obj = User.objects.filter(email=email).first()

        if user_obj:
            # Check lockout
            if user_obj.failed_login_attempts >= 5 and user_obj.last_failed_login:
                if timezone.now() < user_obj.last_failed_login + timedelta(minutes=15):
                    raise AuthenticationFailed('Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.')
                else:
                    # Reset after 15 minutes
                    user_obj.failed_login_attempts = 0
                    user_obj.save(update_fields=['failed_login_attempts'])

        try:
            data = super().validate(attrs)
        except AuthenticationFailed as e:
            if user_obj:
                user_obj.failed_login_attempts += 1
                user_obj.last_failed_login = timezone.now()
                user_obj.save(update_fields=['failed_login_attempts', 'last_failed_login'])
            raise e

        user = self.user
        
        # Reset failed attempts on successful login
        if user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            user.save(update_fields=['failed_login_attempts'])
        
        # Check if login is from a clinic subdomain
        request = self.context.get('request')
        if request and hasattr(request, 'clinic') and request.clinic:
            # Subdomain login - user must belong to this clinic
            if user.role == 'SUPER_ADMIN':
                # Super admins can login from anywhere
                pass
            elif user.clinic_id != request.clinic.id:
                raise serializers.ValidationError(
                    {'detail': 'You do not have access to this clinic.'}
                )
        
        # Check if password needs to be changed
        must_change = False
        if user.force_password_change:
            must_change = True
        elif user.password_last_changed:
            if timezone.now() > user.password_last_changed + timedelta(days=90):
                must_change = True
        else:
            must_change = True

        data['user'] = {
            'id':          user.id,
            'email':       user.email,
            'full_name':   user.get_full_name(),
            'role':        user.role,
            'clinic_id':   user.clinic_id,
            'clinic_name': user.clinic.clinic_name if user.clinic else None,
            'must_change_password': must_change,
        }
        
        # Include clinic info from subdomain if available
        if request and hasattr(request, 'clinic') and request.clinic:
            data['clinic'] = {
                'id': request.clinic.id,
                'name': request.clinic.clinic_name,
                'subdomain': request.clinic.subdomain,
            }
        
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name   = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()
    password    = serializers.CharField(write_only=True, required=False)

    class Meta:
        model  = User
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email',
            'phone', 'role', 'clinic', 'clinic_name',
            'is_active', 'date_joined', 'password'
        ]
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name if obj.clinic else None

    def validate(self, attrs):
        request = self.context.get('request')
        if not request:
            return attrs
        role   = attrs.get('role', getattr(self.instance, 'role', None))
        clinic = attrs.get('clinic', getattr(self.instance, 'clinic', None))
        if request.user.role == 'ADMIN':
            if role not in ['DENTIST', 'RECEPTION', 'HYGIENIST', 'ACCOUNT_MANAGER']:
                raise serializers.ValidationError(
                    'Clinic Admin can only create Dentists, Hygienists, Account Managers, or Receptionists.')
            if clinic and clinic != request.user.clinic:
                raise serializers.ValidationError(
                    'You can only create users for your own clinic.')
        # Super Admin can create ADMIN, SUPPORT_AGENT, DENTIST, RECEPTION, etc.
        if request.user.role == 'SUPER_ADMIN':
            if role == 'SUPER_ADMIN':
                raise serializers.ValidationError(
                    'Cannot create another Super Admin via API.'
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        request  = self.context.get('request')
        if request and request.user.role == 'ADMIN':
            validated_data['clinic'] = request.user.clinic
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    full_name   = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()

    class Meta:
        model        = User
        fields       = ['id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'role', 'clinic', 'clinic_name']
        read_only_fields = ['id', 'email', 'role', 'clinic']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name if obj.clinic else None


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value

    def validate_new_password(self, value):
        user = self.context['request'].user
        
        # Validate complexity using django standard validators (which includes our custom one)
        try:
            validate_password(value, user)
        except serializers.ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
            
        # Check password history (last 5 passwords)
        history = user.password_history.all()[:5]
        for hist in history:
            if check_password(value, hist.password):
                raise serializers.ValidationError('You cannot reuse any of your last 5 passwords.')
                
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        new_password = self.validated_data['new_password']
        
        # Save old password to history before changing
        if user.password:
            UserPasswordHistory.objects.create(user=user, password=user.password)
            
        user.set_password(new_password)
        user.password_last_changed = timezone.now()
        user.force_password_change = False
        user.save()
        
# Re-apply clinic check separately (keeps logic clean)
# Clinic Admin can only create for their own clinic
