# AltSchool Tinyuka 2024 Semester 3 – Month 1 Assessment

> You are working on a lightweight product called CloudLaunch, a platform that showcases a basic company website and stores some internal private documents. You are required to deploy it using AWS core services. This exercise demonstrates your understanding of AWS fundamentals including S3, IAM, and VPCs.
---
> ### All resource are created in the `eu-central-1` region
---

# Task 1 - Cloudlaunch S3 Setup

Here are the steps I took to set up three S3 buckets with different access rules, along with an IAM user (`cloudlaunch-user`) for controlled access.

## 1. Buckets Creation
> All buckets were created from the console with default access control and later configured
---
### `alt-cloudlaunch-site-bucket`
- Purpose: Hosts a simple static website (HTML/CSS/JS).
- Configuration:
    - Static website hosting enabled with `index.html` and optional `error.html`.
    - **Access options:**
        - Public bucket policy allowing anonymous `s3:GetObject` access. Website URL is provided by the S3 static website hosting endpoint.
        - A CloudFront distribution with Origin Access Control (OAC) fronts the bucket to serve the website securely over HTTPS and with global caching.
- Files: HTML, CSS, and JS files uploaded to the bucket.

---

### `alt-cloudlaunch-private-bucket`
- Region: eu-central-1
- Purpose: Private storage accessible only by the designated IAM user.
- Configuration:
    - Public access blocked.
    - IAM user (`cloudlaunch-user`) permissions:
        - **Allowed:** `s3:GetObject`, `s3:PutObject`
        - **Explicitly denied:** `s3:DeleteObject`, `s3:DeleteObjectVersion`
- Effect: User can upload and download files but **cannot delete**.

---

### `Cloudlaunch-visible-only-bucket`
- Region: eu-central-1
- Purpose: Bucket visible to the IAM user but contents inaccessible.
- Configuration:
    - Public access blocked.
    - IAM user (`cloudlaunch-user`) permissions:
        - **Allowed:** `s3:ListBucket`, `s3:GetBucketLocation`
        - **Denied:** `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`
- Effect: User can see the bucket in listings but cannot access or modify objects.

---

## 2. Permission Policy Setup
- From the IAM console, I create `CloudlaunchCombinedPolicy` policy using the JSON editor option to control access to the private and view only bucket and have list access to all 3 buckets.
```yaml
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGetPutOnPrivateBucketObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::alt-cloudlaunch-private-bucket/*"
    },
    {
      "Sid": "ExplicitDenyDeleteOnPrivateBucketObjects",
      "Effect": "Deny",
      "Action": [
        "s3:DeleteObject",
        "s3:DeleteObjectVersion"
      ],
      "Resource": "arn:aws:s3:::alt-cloudlaunch-private-bucket/*"
    },
    {
      "Sid": "AllowListVisibleBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ExplicitDenyGetOnVisibleBucketObjects",
      "Effect": "Deny",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::alt-cloudlaunch-visible-only-bucket/*"
    }
  ]
}
```

## 3. IAM User Setup

### `cloudlaunch-user`
- Created in IAM.
- Given console access (Password reset required on first login.
- Attached policy (`CloudlaunchCombinedPolicy`) with the following rules:
    - **Private bucket:** Can Get/Put objects, cannot Delete.
    - **Visible-only bucket:** Can list the bucket but not view/upload/delete objects.
    - **List bucket** Access to allow viewing buckets in the AWS console.

---

## 4. Access Summary

| Bucket                                  | Public Access       | `cloudlaunch-user` Access                            |
|-----------------------------------------|---------------------|------------------------------------------------------|
| **alt-cloudlaunch-site-bucket**         | Public | No special IAM permissions required to view content. |
| **alt-cloudlaunch-private-bucket**      | Blocked            | GetObject, PutObject only (no delete).               |
| **alt-cloudlaunch-visible-only-bucket** | Blocked        | List bucket metadata only (no object access).        |

---

## 5. Site bucket links
- S3 Hosting | [http://alt-cloudlaunch-site-bucket.s3-website.eu-central-1.amazonaws.com](http://alt-cloudlaunch-site-bucket.s3-website.eu-central-1.amazonaws.com)
- CloudFront | [https://d1wvi4d2b3kdjk.cloudfront.net](https://d1wvi4d2b3kdjk.cloudfront.net)


# Task 2 - Cloudlaunch VPC Setup

Below describes the steps I took to design and setup of a secure, logically separated VPC environment for Cloudlaunch.  
No compute resources (EC2, NAT, RDS) are provisioned; this is purely network scaffolding.

> All outlined actions where taken through the console by navigating to the respective resource console

---

## 1. VPC
- **Name:** `cloudlaunch-vpc`
- **CIDR Block:** `10.0.0.0/16`
- Purpose: Provides an isolated virtual network for all future Cloudlaunch resources.

---

## 2. Subnets
| Subnet | CIDR | Purpose |
|--------|------|---------|
| `cloudlaunch-public-subnet` | 10.0.1.0/24 | For load balancers or public-facing resources. |
| `cloudlaunch-app-subnet` | 10.0.2.0/24 | For private application servers. |
| `cloudlaunch-db-subnet` | 10.0.3.0/28 | For databases (private). |

---

## 3. Internet Gateway
- **Name:** `cloudlaunch-igw`
- Attached to `cloudlaunch-vpc`.
- Enables internet connectivity for public resources.

---

## 4. Route Tables
- **Public Route Table (`cloudlaunch-public-rt`):**
    - Associated with `cloudlaunch-public-subnet`.
    - Route: `0.0.0.0/0 → cloudlaunch-igw`.
- **Application Route Table (`cloudlaunch-app-rt`):**
    - Associated with `cloudlaunch-app-subnet`.
    - Local traffic only (no 0.0.0.0/0).
- **Database Route Table (`cloudlaunch-db-rt`):**
    - Associated with `cloudlaunch-db-subnet`.
    - Local traffic only (no 0.0.0.0/0).

---

## 5. Security Groups
- **`cloudlaunch-app-sg`:**
    - Inbound: HTTP (80) from VPC CIDR (`10.0.0.0/16`).
    - Outbound: All traffic allowed.
- **`cloudlaunch-db-sg`:**
    - Inbound: MySQL (3306) allowed only from `cloudlaunch-app-sg`.
    - Outbound: All traffic allowed.

---

## 6. IAM Permissions
- **User:** `cloudlaunch-user`
- **Policy:** `CloudlaunchVPCReadOnly`
- Permissions:
    - View-only access to VPCs, subnets, route tables, internet gateways, and security groups.
    - No permissions to modify or create resources.

```yaml
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VPCReadOnly",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeRouteTables",
        "ec2:DescribeInternetGateways",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcAttribute",
        "ec2:DescribeNatGateways",
        "ec2:DescribeAccountAttributes",
        "ec2:DescribeNetworkAcls",
        "ec2:DescribeDhcpOptions",
        "ec2:DescribeFlowLogs",
        "ec2:DescribeVpnGateways",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeEgressOnlyInternetGateways",
        "ec2:GetSubnetCidrReservations",
        "ec2:DescribeSecurityGroupRules",
        "route53resolver:ListFirewallRuleGroupAssociations"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## User account
- User console sign-in URL | [https://396768595839.signin.aws.amazon.com/console](https://396768595839.signin.aws.amazon.com/console)