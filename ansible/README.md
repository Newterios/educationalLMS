# Ansible - minimal final setup

## Structure
- inventory.yml
- group_vars/all.yml
- playbooks/01_prepare.yml
- playbooks/02_deploy.yml
- playbooks/03_monitoring.yml

## Run order

ansible-playbook -i inventory.yml playbooks/01_prepare.yml
ansible-playbook -i inventory.yml playbooks/02_deploy.yml
ansible-playbook -i inventory.yml playbooks/03_monitoring.yml

## What this covers for criteria
- Environment preparation
- Automated deployment
- Monitoring setup/restart automation