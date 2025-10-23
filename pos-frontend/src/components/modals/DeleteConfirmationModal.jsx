
import React from 'react';
import Modal from '../shared/Modal';
import Button from '../ui/Button';
import { MdDelete, MdClose } from 'react-icons/md';

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isDeleting,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 bg-white rounded-lg shadow-lg max-w-sm w-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <MdDelete className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <MdClose className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={isDeleting}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;
