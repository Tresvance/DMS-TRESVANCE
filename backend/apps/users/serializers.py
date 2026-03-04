from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']     = user.email
        token['role']      = user.role
        token['full_name'] = user.get_full_name()
        token['clinic_id'] = user.clinic_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        
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
        
        data['user'] = {
            'id':          user.id,
            'email':       user.email,
            'full_name':   user.get_full_name(),
            'role':        user.role,
            'clinic_id':   user.clinic_id,
            'clinic_name': user.clinic.clinic_name if user.clinic else None,
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
        if request.user.role == 'CLINIC_ADMIN':
            if role not in ['DOCTOR', 'RECEPTION']:
                raise serializers.ValidationError(
                    'Clinic Admin can only create Doctors or Receptionists.')
            if clinic and clinic != request.user.clinic:
                raise serializers.ValidationError(
                    'You can only create users for your own clinic.')
        # Super Admin can create CLINIC_ADMIN, SUPPORT_AGENT, DOCTOR, RECEPTION
        if request.user.role == 'SUPER_ADMIN':
            if role == 'SUPER_ADMIN':
                raise serializers.ValidationError(
                    'Cannot create another Super Admin via API.'
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        request  = self.context.get('request')
        if request and request.user.role == 'CLINIC_ADMIN':
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
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


# Re-apply clinic check separately (keeps logic clean)
# Clinic Admin can only create for their own clinic
