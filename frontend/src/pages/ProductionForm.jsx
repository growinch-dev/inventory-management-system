import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Button, Input, Select, FormSection } from '../components/ui';
import toast from 'react-hot-toast';

const ProductionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    productionDate: new Date().toISOString().split('T')[0],
    shift: 'Day',
    productId: '',
    batchNumber: '',
    plannedQuantity: '',
    producedQuantity: '',
    rejectedQuantity: '',
    remarks: '',
    materialsConsumed: [],
  });

  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMasterData();
    if (isEdit) {
      fetchProductionDetails();
    }
  }, [id]);

  const fetchMasterData = async () => {
    try {
      // TODO: Replace with actual API calls
      setProducts([
        { value: '1', label: '250ml Bottle' },
        { value: '2', label: '500ml Bottle' },
        { value: '3', label: '1L Bottle' },
        { value: '4', label: '2L Bottle' },
        { value: '5', label: '20L Can' },
      ]);

      setRawMaterials([
        { _id: '1', name: 'PET Preform 500ml', unit: 'Pieces', availableStock: 50000 },
        { _id: '2', name: 'Bottle Cap', unit: 'Pieces', availableStock: 100000 },
        { _id: '3', name: 'Label', unit: 'Pieces', availableStock: 80000 },
        { _id: '4', name: 'Shrink Film', unit: 'KG', availableStock: 500 },
        { _id: '5', name: 'Carton Box', unit: 'Pieces', availableStock: 2000 },
      ]);
    } catch (error) {
      toast.error('Failed to load master data');
    }
  };

  const fetchProductionDetails = async () => {
    try {
      // TODO: Replace with actual API call
      toast.info('Loading production details...');
    } catch (error) {
      toast.error('Failed to load production details');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addMaterialRow = () => {
    setFormData((prev) => ({
      ...prev,
      materialsConsumed: [
        ...prev.materialsConsumed,
        { materialId: '', quantity: '', unit: '' },
      ],
    }));
  };

  const updateMaterialRow = (index, field, value) => {
    setFormData((prev) => {
      const materials = [...prev.materialsConsumed];
      materials[index][field] = value;

      // Auto-fill unit when material is selected
      if (field === 'materialId') {
        const material = rawMaterials.find((m) => m._id === value);
        if (material) {
          materials[index].unit = material.unit;
          materials[index].availableStock = material.availableStock;
        }
      }

      return { ...prev, materialsConsumed: materials };
    });
  };

  const removeMaterialRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      materialsConsumed: prev.materialsConsumed.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Calculate good quantity
    const goodQuantity = (parseInt(formData.producedQuantity) || 0) - (parseInt(formData.rejectedQuantity) || 0);

    if (goodQuantity < 0) {
      toast.error('Rejected quantity cannot be greater than produced quantity');
      return;
    }

    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // if (isEdit) {
      //   await productionAPI.update(id, { ...formData, goodQuantity });
      // } else {
      //   await productionAPI.create({ ...formData, goodQuantity });
      // }

      toast.success(isEdit ? 'Production updated successfully' : 'Production entry created successfully');
      navigate('/production');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save production entry');
    } finally {
      setLoading(false);
    }
  };

  const goodQuantity = (parseInt(formData.producedQuantity) || 0) - (parseInt(formData.rejectedQuantity) || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Production Entry' : 'New Production Entry'}
        description="Record production details and material consumption"
      >
        <Button
          variant="outline"
          onClick={() => navigate('/production')}
          icon={ArrowLeft}
        >
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Production Details */}
        <FormSection title="Production Details">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Production Date"
              type="date"
              value={formData.productionDate}
              onChange={(e) => handleChange('productionDate', e.target.value)}
              required
            />

            <Select
              label="Shift"
              value={formData.shift}
              onChange={(e) => handleChange('shift', e.target.value)}
              options={[
                { value: 'Day', label: 'Day Shift' },
                { value: 'Night', label: 'Night Shift' },
                { value: 'General', label: 'General' },
              ]}
              required
            />

            <Input
              label="Batch Number"
              value={formData.batchNumber}
              onChange={(e) => handleChange('batchNumber', e.target.value)}
              placeholder="Optional"
            />

            <Select
              label="Product / Bottle Size"
              value={formData.productId}
              onChange={(e) => handleChange('productId', e.target.value)}
              options={products}
              placeholder="Select product"
              required
            />
          </div>
        </FormSection>

        {/* Quantity Details */}
        <FormSection title="Production Quantity">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Planned Quantity"
              type="number"
              value={formData.plannedQuantity}
              onChange={(e) => handleChange('plannedQuantity', e.target.value)}
              required
            />

            <Input
              label="Total Produced"
              type="number"
              value={formData.producedQuantity}
              onChange={(e) => handleChange('producedQuantity', e.target.value)}
              required
            />

            <Input
              label="Rejected Quantity"
              type="number"
              value={formData.rejectedQuantity}
              onChange={(e) => handleChange('rejectedQuantity', e.target.value)}
              required
            />

            <Input
              label="Good Quantity"
              type="number"
              value={goodQuantity}
              disabled
              className="bg-success-light"
            />
          </div>
        </FormSection>

        {/* Raw Materials Consumed */}
        <FormSection
          title="Raw Materials Consumed"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMaterialRow}
              icon={Plus}
            >
              Add Material
            </Button>
          }
        >
          {formData.materialsConsumed.length === 0 ? (
            <p className="text-secondary-500 text-center py-4">
              No materials added. Click "Add Material" to record consumption.
            </p>
          ) : (
            <div className="space-y-3">
              {formData.materialsConsumed.map((material, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <Select
                      label={index === 0 ? 'Raw Material' : ''}
                      value={material.materialId}
                      onChange={(e) => updateMaterialRow(index, 'materialId', e.target.value)}
                      options={rawMaterials.map((m) => ({
                        value: m._id,
                        label: `${m.name} (Available: ${m.availableStock} ${m.unit})`,
                      }))}
                      placeholder="Select material"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label={index === 0 ? 'Quantity Consumed' : ''}
                      type="number"
                      value={material.quantity}
                      onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                      placeholder="Quantity"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label={index === 0 ? 'Unit' : ''}
                      value={material.unit}
                      disabled
                      className="bg-secondary-50"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMaterialRow(index)}
                      icon={Trash2}
                      className="text-danger hover:bg-danger-light"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        {/* Additional Information */}
        <FormSection title="Additional Information">
          <Input
            label="Remarks"
            value={formData.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="Any notes or observations"
          />
        </FormSection>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/production')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={Save}
          >
            {isEdit ? 'Update Production' : 'Save Production Entry'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductionForm;
