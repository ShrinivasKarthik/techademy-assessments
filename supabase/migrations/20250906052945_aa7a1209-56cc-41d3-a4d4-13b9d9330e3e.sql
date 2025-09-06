-- Create webhook_configurations table for managing external webhooks
CREATE TABLE public.webhook_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook configurations
CREATE POLICY "Admins can manage webhook configurations"
ON public.webhook_configurations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create external_integrations table for API integrations
CREATE TABLE public.external_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  api_key_encrypted TEXT,
  configuration JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for external integrations
CREATE POLICY "Admins can manage external integrations"
ON public.external_integrations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_webhook_configurations_updated_at
BEFORE UPDATE ON public.webhook_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_integrations_updated_at
BEFORE UPDATE ON public.external_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();