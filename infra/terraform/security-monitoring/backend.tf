terraform {
  # Backend values are supplied only by the protected CI Environment.
  # Do not commit bucket names, state credentials, or access keys here.
  backend "s3" {}
}
