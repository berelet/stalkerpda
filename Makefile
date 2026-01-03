.PHONY: help install deploy deploy-pda deploy-admin logs clean update-lambdas test smoke-test dev-admin outputs

ENVIRONMENT ?= dev
REGION = eu-north-1
PROFILE = stalker

help:
	@echo "PDA ZONE - Available commands:"
	@echo "  make deploy          - Deploy infrastructure to AWS"
	@echo "  make deploy-pda      - Deploy PDA frontend only"
	@echo "  make deploy-admin    - Deploy admin panel only"
	@echo "  make update-lambdas  - Update Lambda code only (fast)"
	@echo "  make test            - Run full API tests"
	@echo "  make smoke-test      - Run quick smoke tests"
	@echo "  make logs            - Tail Lambda logs"
	@echo "  make clean           - Delete stack"
	@echo "  make status          - Show stack status"
	@echo "  make outputs         - Show stack outputs (URLs)"
	@echo "  make dev-admin       - Start admin panel dev server"

deploy:
	@if [ -z "$$DB_PASSWORD" ]; then echo "❌ Set DB_PASSWORD"; exit 1; fi
	@if [ -z "$$JWT_SECRET" ]; then echo "❌ Set JWT_SECRET"; exit 1; fi
	./infrastructure/scripts/deploy.sh $(ENVIRONMENT)

deploy-fe:
	@echo "📦 Building frontend..."
	cd frontend && npm run build
	@echo "📤 Uploading to S3..."
	aws s3 sync frontend/dist s3://pda-zone-frontend-dev-707694916945 --delete --profile $(PROFILE)
	@echo "🔄 Invalidating CloudFront cache..."
	aws cloudfront create-invalidation --distribution-id E1LX6WLS4JUEVL --paths "/*" --profile $(PROFILE) --no-cli-pager
	@echo "✅ PDA Frontend deployed!"

deploy-pda: deploy-fe

deploy-admin:
	@echo "📦 Building admin panel..."
	cd admin && npm run build
	@echo "📤 Uploading to S3..."
	aws s3 sync admin/dist s3://pda-zone-admin-$(ENVIRONMENT)-707694916945 --delete --profile $(PROFILE)
	@echo "🔄 Invalidating CloudFront cache..."
	@ADMIN_DIST_ID=$$(aws cloudformation describe-stacks \
		--stack-name pda-zone-$(ENVIRONMENT) \
		--region $(REGION) \
		--profile $(PROFILE) \
		--query "Stacks[0].Outputs[?OutputKey=='AdminCloudFrontDistributionId'].OutputValue" \
		--output text); \
	if [ -n "$$ADMIN_DIST_ID" ]; then \
		aws cloudfront create-invalidation --distribution-id $$ADMIN_DIST_ID --paths "/*" --profile $(PROFILE) --no-cli-pager; \
		echo "✅ Admin panel deployed!"; \
	else \
		echo "⚠️  Admin CloudFront not found. Run 'make deploy' first."; \
	fi

dev-admin:
	cd admin && npm run dev

update-lambdas:
	./infrastructure/scripts/update-lambdas.sh

test:
	./tests/api-tests.sh

smoke-test:
	./tests/smoke-test.sh

logs:
	sam logs --stack-name pda-zone-$(ENVIRONMENT) --region $(REGION) --profile $(PROFILE) --tail

outputs:
	./infrastructure/scripts/get-outputs.sh $(ENVIRONMENT)

status:
	aws cloudformation describe-stacks \
		--stack-name pda-zone-$(ENVIRONMENT) \
		--region $(REGION) \
		--profile $(PROFILE) \
		--query "Stacks[0].{Status:StackStatus,Updated:LastUpdatedTime}"

clean:
	@echo "⚠️  This will DELETE the entire stack!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		aws cloudformation delete-stack \
			--stack-name pda-zone-$(ENVIRONMENT) \
			--region $(REGION) \
			--profile $(PROFILE); \
		echo "🗑️  Stack deletion initiated"; \
	fi
